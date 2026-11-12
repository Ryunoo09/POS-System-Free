import { describe, expect, it } from 'vitest'
import { shiftHistoryQuerySchema } from '../../src/validators/shift.validator.js'

const validCashierId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301'

describe('shiftHistoryQuerySchema', () => {
  it('menerima query riwayat shift yang valid', () => {
    const result = shiftHistoryQuerySchema.safeParse({
      page: '2',
      limit: '25',
      status: 'OPEN',
      cashier_id: validCashierId,
    })

    expect(result.success).toBe(true)
    expect(result.data).toMatchObject({
      page: 2,
      limit: 25,
      status: 'OPEN',
      cashier_id: validCashierId,
    })
  })

  it('memakai default page 1 dan limit 10', () => {
    const result = shiftHistoryQuerySchema.safeParse({})

    expect(result.success).toBe(true)
    expect(result.data).toMatchObject({ page: 1, limit: 10 })
  })

  it('menolak page 0', () => {
    expect(shiftHistoryQuerySchema.safeParse({ page: '0' }).success).toBe(false)
  })

  it('menolak limit di atas 100', () => {
    expect(shiftHistoryQuerySchema.safeParse({ limit: '101' }).success).toBe(false)
  })

  it('menolak status yang tidak dikenal', () => {
    expect(shiftHistoryQuerySchema.safeParse({ status: 'CLOSED_NOW' }).success).toBe(false)
  })

  it('menolak cashier_id yang bukan UUID', () => {
    expect(shiftHistoryQuerySchema.safeParse({ cashier_id: 'bukan-uuid' }).success).toBe(false)
  })
})
