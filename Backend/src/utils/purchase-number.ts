import { randomUUID } from 'node:crypto'
import { todayInJakarta } from './date-range.js'

/**
 * Format `PO-YYYYMMDD-XXXXXX` memakai tanggal bisnis Asia/Jakarta.
 *
 * ponytail: sufiks acak alih-alih sequence DB agar tanpa migrasi tambahan.
 * Ganti ke `nextval('po_number_seq')` bila butuh penomoran berurutan.
 */
export const formatPurchaseOrderNumber = (date: Date = new Date()): string => {
  const day = todayInJakarta(date).replace(/-/g, '')
  const suffix = randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()

  return `PO-${day}-${suffix}`
}
