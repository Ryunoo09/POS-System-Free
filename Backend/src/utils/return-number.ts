import { randomUUID } from 'node:crypto'
import { todayInJakarta } from './date-range.js'

/**
 * Format `RET-YYYYMMDD-XXXXXX` memakai tanggal bisnis Asia/Jakarta.
 *
 * ponytail: memakai sufiks acak alih-alih sequence DB agar tidak butuh migrasi
 * tambahan. Ganti ke `nextval('return_number_seq')` bila butuh penomoran berurutan.
 */
export const formatReturnNumber = (date: Date = new Date()): string => {
  const day = todayInJakarta(date).replace(/-/g, '')
  const suffix = randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()

  return `RET-${day}-${suffix}`
}