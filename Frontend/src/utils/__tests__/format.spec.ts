import { describe, expect, it } from 'vitest'
import { formatDate, formatNumber, formatRupiah, parseDecimal } from '../format'

describe('formatRupiah', () => {
  it('memformat angka sebagai Rupiah tanpa desimal', () => {
    expect(formatRupiah(15_000)).toBe('Rp 15.000')
    expect(formatRupiah('250000')).toBe('Rp 250.000')
  })

  it('menerima nilai nol', () => {
    expect(formatRupiah(0)).toBe('Rp 0')
  })
})

describe('formatNumber', () => {
  it('memakai pemisah ribuan Indonesia', () => {
    expect(formatNumber(1_234_567)).toBe('1.234.567')
  })
})

describe('parseDecimal', () => {
  it('mengubah string desimal dari API menjadi number', () => {
    expect(parseDecimal('12.50')).toBe(12.5)
  })
})

describe('formatDate', () => {
  it('memakai timezone Asia/Jakarta untuk tanggal yang melewati tengah malam UTC', () => {
    expect(formatDate('2026-11-05T17:30:00.000Z')).toBe('6 Nov 2026')
  })
})
