import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import bcrypt from 'bcrypt'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserRepository } from '../../src/repositories/user.repository.js'
import {
  createBackupService,
  type BackupCommandRunner,
} from '../../src/services/backup.service.js'
import { formatBackupFilename, isSafeBackupFilename } from '../../src/utils/backup-file.js'

let backupDir: string

beforeEach(async () => {
  backupDir = await mkdtemp(join(tmpdir(), 'pos-backup-test-'))
})

afterEach(async () => {
  await rm(backupDir, { recursive: true, force: true })
})

const buildUserRepository = (passwordHash: string): UserRepository =>
  ({
    findById: async () => ({ id: 'admin-1', passwordHash }),
  }) as unknown as UserRepository

describe('backup filename', () => {
  it('memformat nama file dump sesuai pola', () => {
    expect(formatBackupFilename(new Date('2026-11-10T02:05:09Z'))).toMatch(
      /^pos-\d{8}-\d{6}\.dump$/,
    )
  })

  it('menolak nama file yang tidak aman', () => {
    expect(isSafeBackupFilename('pos-20261110-020509.dump')).toBe(true)
    expect(isSafeBackupFilename('../pos-20261110-020509.dump')).toBe(false)
    expect(isSafeBackupFilename('pos-20261110-0205.dump')).toBe(false)
    expect(isSafeBackupFilename('evil.dump')).toBe(false)
  })
})

describe('backup.service create/list', () => {
  it('membuat file dump dan mencatat audit', async () => {
    const runCommand = vi.fn<BackupCommandRunner>(async (_command, args) => {
      const file = args[args.indexOf('-f') + 1]
      if (file) await writeFile(file, 'dump-bytes')
    })

    const record = vi.fn(async () => undefined)
    const service = createBackupService({
      userRepository: buildUserRepository('x'),
      audit: { record },
      backupDir,
      runCommand,
    })

    const dto = await service.create({ id: 'admin-1' })

    expect(dto.filename).toMatch(/^pos-\d{8}-\d{6}\.dump$/)
    expect(dto.size_bytes).toBeGreaterThan(0)
    expect(runCommand).toHaveBeenCalledWith(
      'pg_dump',
      expect.arrayContaining(['-Fc', '--no-owner']),
      expect.objectContaining({ PGPASSWORD: expect.any(String) }),
    )
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', entity: 'BACKUP', entityId: dto.filename }),
    )
  })

  it('hanya menampilkan file dengan pola valid, urut terbaru dulu', async () => {
    await writeFile(join(backupDir, 'pos-20261109-020000.dump'), 'a')
    await writeFile(join(backupDir, 'pos-20261110-020000.dump'), 'bb')
    await writeFile(join(backupDir, 'catatan.txt'), 'ignore')

    const service = createBackupService({
      userRepository: buildUserRepository('x'),
      backupDir,
      runCommand: vi.fn(async () => undefined),
    })

    const items = await service.list()

    expect(items.map((item) => item.filename)).toEqual([
      'pos-20261110-020000.dump',
      'pos-20261109-020000.dump',
    ])
    expect(items[1]?.size_bytes).toBe(1)
  })

  it('menolak path traversal saat download', async () => {
    const service = createBackupService({
      userRepository: buildUserRepository('x'),
      backupDir,
      runCommand: vi.fn(async () => undefined),
    })

    await expect(service.getDownloadPath('../pos-20261110-020000.dump')).rejects.toThrow(
      'tidak ditemukan',
    )
    await expect(service.getDownloadPath('pos-20261110-020000.dump')).rejects.toThrow(
      'tidak ditemukan',
    )
  })
})

describe('backup.service restore', () => {
  it('menolak password salah', async () => {
    const filename = 'pos-20261110-020000.dump'
    await writeFile(join(backupDir, filename), 'dump')
    const hash = await bcrypt.hash('rahasia', 4)

    const service = createBackupService({
      userRepository: buildUserRepository(hash),
      backupDir,
      runCommand: vi.fn(async () => undefined),
    })

    await expect(
      service.restore({ filename, password: 'salah', confirmation: 'RESTORE' }, { id: 'admin-1' }),
    ).rejects.toThrow('Password salah')
  })

  it('menjalankan pg_restore dan mencatat audit dengan password benar', async () => {
    const filename = 'pos-20261110-020000.dump'
    await writeFile(join(backupDir, filename), 'dump')
    const hash = await bcrypt.hash('rahasia', 4)

    const runCommand = vi.fn<BackupCommandRunner>(async () => undefined)
    const record = vi.fn(async () => undefined)
    const service = createBackupService({
      userRepository: buildUserRepository(hash),
      audit: { record },
      backupDir,
      runCommand,
    })

    await service.restore(
      { filename, password: 'rahasia', confirmation: 'RESTORE' },
      { id: 'admin-1' },
    )

    expect(runCommand).toHaveBeenCalledWith(
      'pg_restore',
      expect.arrayContaining(['--clean', '--if-exists', join(backupDir, filename)]),
      expect.any(Object),
    )
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'RESTORE', entity: 'BACKUP', entityId: filename }),
    )
    await stat(join(backupDir, filename))
  })
})
