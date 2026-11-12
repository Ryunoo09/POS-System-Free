import { execFile } from 'node:child_process'
import { appendFile, mkdir, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcrypt'
import { env } from '../config/env.js'
import { BusinessRuleError, NotFoundError, UnauthorizedError } from '../errors/app-errors.js'
import type { UserRepository } from '../repositories/user.repository.js'
import type { AuditRecorder } from './audit.service.js'
import {
  formatAuditExportFilename,
  formatBackupFilename,
  isSafeBackupFilename,
} from '../utils/backup-file.js'
import type { RestoreBackupInput } from '../validators/backup.validator.js'

export interface BackupFileDto {
  filename: string
  size_bytes: number
  created_at: string
}

export interface BackupActor {
  id: string | null
  ipAddress?: string | null
  userAgent?: string | null
}

export interface BackupService {
  create: (actor: BackupActor) => Promise<BackupFileDto>
  list: () => Promise<BackupFileDto[]>
  getDownloadPath: (filename: string) => Promise<{ path: string; filename: string }>
  restore: (input: RestoreBackupInput, actor: BackupActor) => Promise<void>
}

export type BackupCommandRunner = (
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
) => Promise<void>

const defaultBackupDir = fileURLToPath(new URL('../../backups/', import.meta.url))

const defaultRunCommand: BackupCommandRunner = (command, args, envVars) =>
  new Promise((resolve, reject) => {
    execFile(command, args, { env: envVars, maxBuffer: 16 * 1024 * 1024 }, (error, _stdout, stderr) => {
      if (error) {
        reject(new Error(stderr.trim() || error.message))
        return
      }

      resolve()
    })
  })

interface DbConnection {
  host: string
  port: string
  user: string
  database: string
  password: string
}

const parseConnection = (databaseUrl: string): DbConnection => {
  const url = new URL(databaseUrl)

  return {
    host: url.hostname,
    port: url.port || '5432',
    user: decodeURIComponent(url.username),
    database: decodeURIComponent(url.pathname.replace(/^\//, '')),
    password: decodeURIComponent(url.password),
  }
}

const toDto = (filename: string, size: number, createdAt: Date): BackupFileDto => ({
  filename,
  size_bytes: size,
  created_at: createdAt.toISOString(),
})

export const createBackupService = ({
  userRepository,
  audit,
  backupDir = defaultBackupDir,
  runCommand = defaultRunCommand,
}: {
  userRepository: UserRepository
  audit?: AuditRecorder
  backupDir?: string
  runCommand?: BackupCommandRunner
}): BackupService => {
  let busy = false

  const withBusy = async <T>(operation: () => Promise<T>): Promise<T> => {
    if (busy) {
      throw new BusinessRuleError(
        'Operasi backup/restore sedang berjalan',
        'BACKUP_BUSY',
      )
    }

    busy = true

    try {
      return await operation()
    } finally {
      busy = false
    }
  }

  const resolveExistingFile = async (filename: string): Promise<string> => {
    if (!isSafeBackupFilename(filename)) {
      throw new NotFoundError('File backup tidak ditemukan', 'NOT_FOUND')
    }

    const filePath = join(backupDir, filename)

    try {
      const info = await stat(filePath)

      if (!info.isFile()) throw new Error('bukan file')
    } catch {
      throw new NotFoundError('File backup tidak ditemukan', 'NOT_FOUND')
    }

    return filePath
  }

  const connectionArgs = (connection: DbConnection): string[] => [
    '-h',
    connection.host,
    '-p',
    connection.port,
    '-U',
    connection.user,
    '-d',
    connection.database,
  ]

  const appendRestoreAudit = (entry: Record<string, unknown>): Promise<void> =>
    appendFile(
      join(backupDir, 'restore-audit.jsonl'),
      `${JSON.stringify(entry)}\n`,
      'utf8',
    )

  return {
    create: (actor) =>
      withBusy(async () => {
        await mkdir(backupDir, { recursive: true })

        const filename = formatBackupFilename()
        const filePath = join(backupDir, filename)
        const connection = parseConnection(env.DATABASE_URL)

        await runCommand(
          'pg_dump',
          [
            '-Fc',
            '--no-owner',
            '--no-privileges',
            ...connectionArgs(connection),
            '-f',
            filePath,
          ],
          { ...process.env, PGPASSWORD: connection.password },
        )

        const info = await stat(filePath)
        const dto = toDto(filename, info.size, info.mtime)

        await audit?.record({
          userId: actor.id,
          action: 'CREATE',
          entity: 'BACKUP',
          entityId: filename,
          newValue: { filename, size_bytes: info.size },
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        })

        return dto
      }),

    list: async () => {
      await mkdir(backupDir, { recursive: true })

      const entries = await readdir(backupDir, { withFileTypes: true })
      const files = entries
        .filter((entry) => entry.isFile() && isSafeBackupFilename(entry.name))
        .map((entry) => entry.name)

      const items = await Promise.all(
        files.map(async (filename) => {
          const info = await stat(join(backupDir, filename))
          return toDto(filename, info.size, info.mtime)
        }),
      )

      return items.sort((a, b) => b.created_at.localeCompare(a.created_at))
    },

    getDownloadPath: async (filename) => ({
      path: await resolveExistingFile(filename),
      filename,
    }),

    restore: (input, actor) =>
      withBusy(async () => {
        if (!actor.id) {
          throw new UnauthorizedError('Sesi tidak valid', 'TOKEN_INVALID')
        }

        const filePath = await resolveExistingFile(input.filename)

        const user = await userRepository.findById(actor.id)

        if (!user) {
          throw new UnauthorizedError('Sesi tidak valid', 'TOKEN_INVALID')
        }

        const passwordMatches = await bcrypt.compare(input.password, user.passwordHash)

        if (!passwordMatches) {
          throw new UnauthorizedError('Password salah', 'INVALID_PASSWORD')
        }

        const connection = parseConnection(env.DATABASE_URL)

        await mkdir(backupDir, { recursive: true })

        const auditExportPath = join(backupDir, formatAuditExportFilename())
        const connectionEnv = { ...process.env, PGPASSWORD: connection.password }

        await appendRestoreAudit({
          status: 'STARTED',
          actorId: actor.id,
          filename: input.filename,
          audit_export: auditExportPath,
          ip_address: actor.ipAddress ?? null,
          user_agent: actor.userAgent ?? null,
          at: new Date().toISOString(),
        })

        try {
          await runCommand(
            'pg_dump',
            [
              '--data-only',
              '--table=audit_logs',
              '--no-owner',
              '--no-privileges',
              ...connectionArgs(connection),
              '-f',
              auditExportPath,
            ],
            connectionEnv,
          )
        } catch (error) {
          const detail = error instanceof Error ? error.message : 'unknown error'

          await appendRestoreAudit({
            status: 'FAILED',
            actorId: actor.id,
            filename: input.filename,
            audit_export: auditExportPath,
            ip_address: actor.ipAddress ?? null,
            user_agent: actor.userAgent ?? null,
            error: `Gagal mengekspor audit sebelum restore: ${detail}`,
            at: new Date().toISOString(),
          })

          throw new BusinessRuleError(
            `Gagal mengekspor audit sebelum restore: ${detail}`,
            'BACKUP_AUDIT_EXPORT_FAILED',
          )
        }

        try {
          await runCommand(
            'pg_restore',
            [
              '--clean',
              '--if-exists',
              '--no-owner',
              '--no-privileges',
              ...connectionArgs(connection),
              filePath,
            ],
            connectionEnv,
          )
        } catch (error) {
          const detail = error instanceof Error ? error.message : 'unknown error'

          await appendRestoreAudit({
            status: 'FAILED',
            actorId: actor.id,
            filename: input.filename,
            audit_export: auditExportPath,
            ip_address: actor.ipAddress ?? null,
            user_agent: actor.userAgent ?? null,
            error: detail,
            at: new Date().toISOString(),
          })

          throw error
        }

        await appendRestoreAudit({
          status: 'COMPLETED',
          actorId: actor.id,
          filename: input.filename,
          audit_export: auditExportPath,
          ip_address: actor.ipAddress ?? null,
          user_agent: actor.userAgent ?? null,
          at: new Date().toISOString(),
        })

        await audit?.record({
          userId: actor.id,
          action: 'RESTORE',
          entity: 'BACKUP',
          entityId: input.filename,
          newValue: { filename: input.filename },
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        })
      }),
  }
}