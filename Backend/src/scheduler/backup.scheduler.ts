import type { BackupService } from '../services/backup.service.js'
import { logger } from '../utils/logger.js'

/**
 * Jadwal backup harian pukul 02:00 waktu lokal server.
 *
 * ponytail: memakai setTimeout native, bukan node-cron. Cukup untuk satu
 * jadwal tetap; ganti ke node-cron bila butuh ekspresi cron yang kompleks.
 */
const BACKUP_HOUR = 2

let timer: NodeJS.Timeout | null = null

const msUntilNextRun = (now: Date = new Date()): number => {
  const next = new Date(now)
  next.setHours(BACKUP_HOUR, 0, 0, 0)

  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1)
  }

  return next.getTime() - now.getTime()
}

export const startBackupScheduler = (backupService: BackupService): void => {
  if (timer) return

  const schedule = (): void => {
    timer = setTimeout(async () => {
      try {
        const file = await backupService.create({ id: null })
        logger.info(`Backup harian dibuat: ${file.filename}`)
      } catch (error) {
        logger.error('Backup harian gagal', error)
      }

      schedule()
    }, msUntilNextRun())

    timer.unref()
  }

  schedule()
}

export const stopBackupScheduler = (): void => {
  if (!timer) return

  clearTimeout(timer)
  timer = null
}