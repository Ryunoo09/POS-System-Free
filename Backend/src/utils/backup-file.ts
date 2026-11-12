import { JAKARTA_TIME_ZONE } from './date-range.js'

/** Nama file dump: `pos-YYYYMMDD-HHmmss.dump` (waktu Asia/Jakarta). */
export const BACKUP_FILE_PATTERN = /^pos-\d{8}-\d{6}\.dump$/

const partsOf = (date: Date): Record<string, string> =>
  Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: JAKARTA_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  )

export const formatBackupFilename = (date: Date = new Date()): string => {
  const p = partsOf(date)

  return `pos-${p.year}${p.month}${p.day}-${p.hour}${p.minute}${p.second}.dump`
}

export const formatAuditExportFilename = (date: Date = new Date()): string =>
  formatBackupFilename(date).replace(/\.dump$/, '.audit.sql')

export const isSafeBackupFilename = (filename: string): boolean =>
  BACKUP_FILE_PATTERN.test(filename)
