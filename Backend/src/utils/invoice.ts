import { todayInJakarta } from './date-range.js'

/** Format `INV-YYYYMMDD-NNNNNN` memakai tanggal bisnis Asia/Jakarta (FR-TRANS-004). */
export const formatInvoiceNumber = (sequence: number, date: Date = new Date()): string => {
  if (!Number.isInteger(sequence) || sequence <= 0) {
    throw new Error('Urutan invoice tidak valid')
  }

  const day = todayInJakarta(date).replace(/-/g, '')

  return `INV-${day}-${String(sequence).padStart(6, '0')}`
}
