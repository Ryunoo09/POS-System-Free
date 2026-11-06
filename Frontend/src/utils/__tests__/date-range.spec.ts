import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addDays,
  daysInclusive,
  isValidDateInput,
  rangeForPreset,
  todayInJakarta,
  validateRange,
} from '../date-range'

describe('todayInJakarta', () => {
  it('memakai batas tengah malam Asia/Jakarta', () => {
    expect(todayInJakarta(new Date('2026-11-05T16:30:00Z'))).toBe('2026-11-05')
    expect(todayInJakarta(new Date('2026-11-05T17:30:00Z'))).toBe('2026-11-06')
  })
})

describe('rangeForPreset', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-06T01:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('hari ini', () => {
    expect(rangeForPreset('today')).toEqual({
      start_date: '2026-11-06',
      end_date: '2026-11-06',
    })
  })

  it('7 hari terakhir inklusif', () => {
    expect(rangeForPreset('last7')).toEqual({
      start_date: '2026-10-31',
      end_date: '2026-11-06',
    })
  })

  it('30 hari terakhir inklusif', () => {
    expect(rangeForPreset('last30')).toEqual({
      start_date: '2026-10-08',
      end_date: '2026-11-06',
    })
  })

  it('bulan ini dimulai dari tanggal 1', () => {
    expect(rangeForPreset('thisMonth')).toEqual({
      start_date: '2026-11-01',
      end_date: '2026-11-06',
    })
  })
})

describe('tanggal', () => {
  it('addDays melewati batas bulan', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('daysInclusive menghitung kedua ujung', () => {
    expect(daysInclusive('2026-11-01', '2026-11-01')).toBe(1)
    expect(daysInclusive('2026-11-01', '2026-11-03')).toBe(3)
  })

  it('menolak tanggal yang tidak valid', () => {
    expect(isValidDateInput('2026-02-30')).toBe(false)
    expect(isValidDateInput('2026-2-3')).toBe(false)
    expect(isValidDateInput('2026-02-28')).toBe(true)
  })
})

describe('validateRange', () => {
  it('valid untuk rentang wajar', () => {
    expect(validateRange({ start_date: '2026-11-01', end_date: '2026-11-03' })).toBe('')
  })

  it('menolak tanggal awal setelah tanggal akhir', () => {
    expect(validateRange({ start_date: '2026-11-03', end_date: '2026-11-01' })).toMatch(
      /tidak boleh melebihi/,
    )
  })

  it('menolak rentang lebih dari 366 hari', () => {
    expect(validateRange({ start_date: '2025-01-01', end_date: '2026-01-02' })).toMatch(
      /maksimal 366 hari/,
    )
  })
})