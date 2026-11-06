import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  eachDateInRange,
  resolveDateRange,
  todayInJakarta,
} from '../../src/utils/date-range.js'

describe('todayInJakarta', () => {
  it('memakai batas tengah malam Asia/Jakarta', () => {
    expect(todayInJakarta(new Date('2026-11-05T16:30:00Z'))).toBe('2026-11-05')
    expect(todayInJakarta(new Date('2026-11-05T17:30:00Z'))).toBe('2026-11-06')
  })
})

describe('resolveDateRange', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-06T01:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('default ke hari ini (Asia/Jakarta)', () => {
    const range = resolveDateRange({})

    expect(range.startDate).toBe('2026-11-06')
    expect(range.endDate).toBe('2026-11-06')
  })

  it('menormalkan awal dan akhir hari WIB ke UTC', () => {
    const range = resolveDateRange({ start_date: '2026-11-01', end_date: '2026-11-01' })

    expect(range.startAt.toISOString()).toBe('2026-10-31T17:00:00.000Z')
    expect(range.endAt.toISOString()).toBe('2026-11-01T16:59:59.999Z')
  })

  it('menolak start_date setelah end_date', () => {
    expect(() =>
      resolveDateRange({ start_date: '2026-11-03', end_date: '2026-11-01' }),
    ).toThrowError(/start_date tidak boleh melebihi end_date/)
  })

  it('menolak rentang lebih dari 366 hari', () => {
    expect(() =>
      resolveDateRange({ start_date: '2025-01-01', end_date: '2026-01-02' }),
    ).toThrowError(/maksimal 366 hari/)
  })

  it('menolak tanggal yang tidak valid', () => {
    expect(() =>
      resolveDateRange({ start_date: '2026-02-30', end_date: '2026-03-01' }),
    ).toThrowError(/start_date tidak valid/)
  })
})

describe('eachDateInRange', () => {
  it('mengisi semua tanggal inklusif termasuk pergantian bulan', () => {
    expect(eachDateInRange('2026-10-30', '2026-11-02')).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ])
  })
})