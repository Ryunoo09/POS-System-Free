import { describe, expect, it } from 'vitest'
import { schedulePriceSchema } from '../../src/validators/price.validator.js'

const validBody = {
  selling_price: 2000,
  effective_date: '2026-12-01T00:00:00.000Z',
  reason: 'Naik harga bulan depan',
}

describe('schedulePriceSchema', () => {
  it('menerima body valid dan mengubah tanggal menjadi Date', () => {
    const result = schedulePriceSchema.safeParse(validBody)

    expect(result.success).toBe(true)
    expect(result.success && result.data.effective_date).toBeInstanceOf(Date)
  })

  it('menolak harga negatif', () => {
    expect(
      schedulePriceSchema.safeParse({ ...validBody, selling_price: -1 }).success,
    ).toBe(false)
  })

  it('menolak alasan terlalu pendek', () => {
    expect(schedulePriceSchema.safeParse({ ...validBody, reason: 'ab' }).success).toBe(false)
  })

  it('menolak tanggal tidak valid', () => {
    expect(
      schedulePriceSchema.safeParse({ ...validBody, effective_date: 'bukan-tanggal' }).success,
    ).toBe(false)
  })

  it('menolak field tak dikenal', () => {
    expect(schedulePriceSchema.safeParse({ ...validBody, foo: 'bar' }).success).toBe(false)
  })
})
