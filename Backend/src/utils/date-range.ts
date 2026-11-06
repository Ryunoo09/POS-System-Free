import { ValidationError } from '../errors/app-errors.js'

export const JAKARTA_TIME_ZONE = 'Asia/Jakarta'
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const MAX_RANGE_DAYS = 366
const JAKARTA_OFFSET = '+07:00'

export interface DateRangeInput {
  start_date?: string | undefined
  end_date?: string | undefined
}

export interface ResolvedDateRange {
  startDate: string
  endDate: string
  startAt: Date
  endAt: Date
}

/** Tanggal hari ini menurut zona Asia/Jakarta dalam format YYYY-MM-DD. */
export const todayInJakarta = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: JAKARTA_TIME_ZONE }).format(now)

const isValidDate = (value: string): boolean => {
  if (!DATE_PATTERN.test(value)) return false

  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

const daysBetween = (startDate: string, endDate: string): number =>
  Math.floor(
    (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86_400_000,
  ) + 1

/**
 * Menormalkan rentang `YYYY-MM-DD` (Asia/Jakarta) menjadi batas UTC.
 * Default: hari ini; maksimum 366 hari.
 */
export const resolveDateRange = (input: DateRangeInput): ResolvedDateRange => {
  const endDate = input.end_date ?? todayInJakarta()
  const startDate = input.start_date ?? endDate

  if (!isValidDate(startDate)) {
    throw new ValidationError('start_date tidak valid', [
      { field: 'start_date', message: 'Format tanggal harus YYYY-MM-DD' },
    ])
  }

  if (!isValidDate(endDate)) {
    throw new ValidationError('end_date tidak valid', [
      { field: 'end_date', message: 'Format tanggal harus YYYY-MM-DD' },
    ])
  }

  const totalDays = daysBetween(startDate, endDate)

  if (totalDays <= 0) {
    throw new ValidationError('start_date tidak boleh melebihi end_date', [
      { field: 'start_date', message: 'start_date tidak boleh melebihi end_date' },
    ])
  }

  if (totalDays > MAX_RANGE_DAYS) {
    throw new ValidationError('Rentang tanggal maksimal 366 hari', [
      { field: 'end_date', message: 'Rentang tanggal maksimal 366 hari' },
    ])
  }

  return {
    startDate,
    endDate,
    startAt: new Date(`${startDate}T00:00:00${JAKARTA_OFFSET}`),
    endAt: new Date(`${endDate}T23:59:59.999${JAKARTA_OFFSET}`),
  }
}

/**
 * Rentang dengan durasi sama tepat sebelum rentang ini, dipakai untuk delta KPI.
 * Contoh: 2026-11-01..2026-11-03 -> 2026-10-29..2026-10-31.
 */
export const previousDateRange = (range: ResolvedDateRange): ResolvedDateRange => {
  const totalDays = daysBetween(range.startDate, range.endDate)

  const previousEnd = new Date(`${range.startDate}T00:00:00Z`)
  previousEnd.setUTCDate(previousEnd.getUTCDate() - 1)

  const previousStart = new Date(previousEnd)
  previousStart.setUTCDate(previousStart.getUTCDate() - (totalDays - 1))

  return resolveDateRange({
    start_date: previousStart.toISOString().slice(0, 10),
    end_date: previousEnd.toISOString().slice(0, 10),
  })
}

/** Daftar tanggal inklusif pada rentang, urut naik. */
export const eachDateInRange = (startDate: string, endDate: string): string[] => {
  const dates: string[] = []
  const cursor = new Date(`${startDate}T00:00:00Z`)
  const last = new Date(`${endDate}T00:00:00Z`)

  while (cursor.getTime() <= last.getTime()) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return dates
}