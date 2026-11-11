import { randomUUID } from 'node:crypto'
import { todayInJakarta } from './date-range.js'

/**
 * Format `OPN-YYYYMMDD-XXXXXXXX` memakai tanggal bisnis Asia/Jakarta.
 *
 * ponytail: sufiks acak alih-alih sequence DB agar tanpa migrasi tambahan.
 */
export const formatOpnameSessionNumber = (date: Date = new Date()): string => {
  const day = todayInJakarta(date).replace(/-/g, '')
  const suffix = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()

  return `OPN-${day}-${suffix}`
}