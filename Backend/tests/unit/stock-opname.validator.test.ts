import { describe, expect, it } from 'vitest'
import { createStockOpnameSchema } from '../../src/validators/stock-opname.validator.js'

const validProductId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301'
const validCategoryId = '3f2504e0-4f89-41d3-9a0c-0305e82c3302'

describe('createStockOpnameSchema', () => {
  it('accepts scope ALL without ids', () => {
    expect(createStockOpnameSchema.safeParse({ name: 'Opname', scope: 'ALL' }).success).toBe(true)
  })

  it('requires product_ids for scope PRODUCT', () => {
    const result = createStockOpnameSchema.safeParse({ name: 'Opname', scope: 'PRODUCT' })

    expect(result.success).toBe(false)
  })

  it('requires category_ids for scope CATEGORY', () => {
    const result = createStockOpnameSchema.safeParse({ name: 'Opname', scope: 'CATEGORY' })

    expect(result.success).toBe(false)
  })

  it('rejects product_ids on scope CATEGORY', () => {
    const result = createStockOpnameSchema.safeParse({
      name: 'Opname',
      scope: 'CATEGORY',
      category_ids: [validCategoryId],
      product_ids: [validProductId],
    })

    expect(result.success).toBe(false)
  })

  it('rejects category_ids on scope ALL', () => {
    const result = createStockOpnameSchema.safeParse({
      name: 'Opname',
      scope: 'ALL',
      category_ids: [validCategoryId],
    })

    expect(result.success).toBe(false)
  })

  it('accepts consistent CATEGORY and PRODUCT payloads', () => {
    expect(
      createStockOpnameSchema.safeParse({
        name: 'Opname',
        scope: 'CATEGORY',
        category_ids: [validCategoryId],
      }).success,
    ).toBe(true)
    expect(
      createStockOpnameSchema.safeParse({
        name: 'Opname',
        scope: 'PRODUCT',
        product_ids: [validProductId],
      }).success,
    ).toBe(true)
  })
})
