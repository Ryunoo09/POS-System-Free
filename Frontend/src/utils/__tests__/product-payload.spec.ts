import { describe, expect, it } from 'vitest'
import type { ProductFormValues } from '@/types/product'
import { toProductCreatePayload, toProductUpdatePayload } from '../product-payload'

const values: ProductFormValues = {
  sku: ' mkn-001 ',
  barcode: '12345678',
  name: ' Kopi Susu ',
  description: '  ',
  category_id: 'cat-1',
  unit: ' gelas ',
  cost_price: 3000,
  selling_price: 5000,
  stock: 10,
  min_stock: 2,
}

describe('product payload', () => {
  it('membentuk payload create lengkap dengan stok dan barcode', () => {
    expect(toProductCreatePayload(values)).toEqual({
      sku: 'MKN-001',
      barcode: '12345678',
      name: 'Kopi Susu',
      description: undefined,
      category_id: 'cat-1',
      unit: 'gelas',
      cost_price: 3000,
      selling_price: 5000,
      stock: 10,
      min_stock: 2,
    })
  })

  it('tidak menyertakan stok pada payload update', () => {
    const payload = toProductUpdatePayload(values)

    expect(payload).not.toHaveProperty('stock')
    expect(payload.sku).toBe('MKN-001')
  })

  it('menghilangkan barcode kosong dari payload create', () => {
    const payload = toProductCreatePayload({ ...values, barcode: '   ' })

    expect(payload).not.toHaveProperty('barcode')
  })
})