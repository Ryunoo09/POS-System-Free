import { describe, expect, it } from 'vitest'
import {
  bulkPriceApplySchema,
  bulkPricePreviewSchema,
  schedulePriceSchema,
} from '../../src/validators/price.validator.js'

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

describe('bulkPricePreviewSchema', () => {
  const base = { mode: 'PERCENT', value: 10, product_ids: ['6c3f6f1d-1e2a-4b3c-8d4e-5f6a7b8c9d0e'] }

  it('menerima target product_ids', () => {
    expect(bulkPricePreviewSchema.safeParse(base).success).toBe(true)
  })

  it('menerima target category_id', () => {
    expect(
      bulkPricePreviewSchema.safeParse({
        mode: 'SET',
        value: 5000,
        category_id: '6c3f6f1d-1e2a-4b3c-8d4e-5f6a7b8c9d0e',
      }).success,
    ).toBe(true)
  })

  it('menolak tanpa target dan menolak dua target sekaligus', () => {
    expect(bulkPricePreviewSchema.safeParse({ mode: 'SET', value: 1 }).success).toBe(false)
    expect(
      bulkPricePreviewSchema.safeParse({
        ...base,
        category_id: '6c3f6f1d-1e2a-4b3c-8d4e-5f6a7b8c9d0e',
      }).success,
    ).toBe(false)
  })

  it('menolak persentase di luar batas', () => {
    expect(bulkPricePreviewSchema.safeParse({ ...base, value: -100 }).success).toBe(false)
    expect(bulkPricePreviewSchema.safeParse({ ...base, value: 1001 }).success).toBe(false)
  })

  it('menolak mode SET dengan harga negatif', () => {
    expect(bulkPricePreviewSchema.safeParse({ ...base, mode: 'SET', value: -1 }).success).toBe(
      false,
    )
  })

  it('menolak nominal lebih dari 2 digit desimal', () => {
    expect(
      bulkPricePreviewSchema.safeParse({ ...base, mode: 'NOMINAL', value: 10.005 }).success,
    ).toBe(false)
  })

  it('mewajibkan reason pada apply', () => {
    expect(bulkPriceApplySchema.safeParse(base).success).toBe(false)
    expect(bulkPriceApplySchema.safeParse({ ...base, reason: 'Penyesuaian pasar' }).success).toBe(
      true,
    )
  })
})
