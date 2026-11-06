import type { DateRange, DateRangePreset } from '@/types/dashboard'

export const MAX_RANGE_DAYS = 366
export const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Tanggal hari ini menurut zona Asia/Jakarta (YYYY-MM-DD). */
export const todayInJakarta = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now)

const toUtcDate = (value: string): Date => new Date(`${value}T00:00:00Z`)

export const addDays = (value: string, days: number): string => {
  const date = toUtcDate(value)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export const daysInclusive = (startDate: string, endDate: string): number =>
  Math.floor((toUtcDate(endDate).getTime() - toUtcDate(startDate).getTime()) / 86_400_000) + 1

export const isValidDateInput = (value: string): boolean => {
  if (!DATE_INPUT_PATTERN.test(value)) return false

  const parsed = toUtcDate(value)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export const rangeForPreset = (
  preset: DateRangePreset,
  now: Date = new Date(),
): DateRange => {
  const today = todayInJakarta(now)

  switch (preset) {
    case 'last7':
      return { start_date: addDays(today, -6), end_date: today }
    case 'last30':
      return { start_date: addDays(today, -29), end_date: today }
    case 'thisMonth':
      return { start_date: `${today.slice(0, 7)}-01`, end_date: today }
    case 'today':
    case 'custom':
    default:
      return { start_date: today, end_date: today }
  }
}

/** Mengembalikan pesan kesalahan, atau string kosong bila valid. */
export const validateRange = (range: DateRange): string => {
  if (!isValidDateInput(range.start_date) || !isValidDateInput(range.end_date)) {
    return 'Tanggal tidak valid'
  }

  if (range.start_date > range.end_date) {
    return 'Tanggal awal tidak boleh melebihi tanggal akhir'
  }

  if (daysInclusive(range.start_date, range.end_date) > MAX_RANGE_DAYS) {
    return 'Rentang tanggal maksimal 366 hari'
  }

  return ''
}