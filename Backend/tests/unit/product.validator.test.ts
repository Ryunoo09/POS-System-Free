import { describe, expect, it } from 'vitest'
import {
  createProductSchema,
  updateProductSchema,
} from '../../src/validators/product.validator.js'

const validBody = {
  sku: 'skn-001',
  name: 'Produk Uji',
  category_id: '6c3f6f1d-1e2a-4b3c-8d4e-5f6a7b8c9d0e',
  unit: 'pcs',
  cost_price: 1000,
  selling_price: 1500,
  stock: 5,
  min_stock: 2,
}

describe('createProductSchema', () => {
  it('meng-uppercase SKU dan menerima body valid', () => {
    const result = createProductSchema.safeParse(validBody)

    expect(result.success).toBe(true)
    expect(result.success && result.data.sku).toBe('SKN-001')
  })

  it('menolak harga negatif', () => {
    const result = createProductSchema.safeParse({ ...validBody, selling_price: -1 })

    expect(result.success).toBe(false)
  })

  it('menolak stok negatif', () => {
    const result = createProductSchema.safeParse({ ...validBody, stock: -1 })

    expect(result.success).toBe(false)
  })

  it('menolak lebih dari 2 digit desimal', () => {
    const result = createProductSchema.safeParse({ ...validBody, selling_price: 1500.123 })

    expect(result.success).toBe(false)
  })

  it('menolak field tak dikenal', () => {
    const result = createProductSchema.safeParse({ ...validBody, foo: 'bar' })

    expect(result.success).toBe(false)
  })
})

describe('updateProductSchema', () => {
  it('menolak field stock', () => {
    const result = updateProductSchema.safeParse({ name: 'Baru', stock: 10 })

    expect(result.success).toBe(false)
  })

  it('menolak body kosong', () => {
    const result = updateProductSchema.safeParse({})

    expect(result.success).toBe(false)
  })

  it('menerima sebagian field', () => {
    const result = updateProductSchema.safeParse({ is_active: false })

    expect(result.success).toBe(true)
  })
})
