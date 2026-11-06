import { describe, expect, it } from 'vitest'
import { calculateChange, calculateTotals } from '../../src/utils/pricing.js'

const item = (
  unitPrice: string,
  quantity: number,
  discountAmount = '0.00',
  unitCost = '0.00',
) => ({
  productId: 'product-1',
  quantity,
  unitPrice,
  unitCost,
  discountAmount,
})

describe('calculateTotals', () => {
  it('menghitung pajak 11% dan total sesuai contoh PRD', () => {
    const result = calculateTotals({
      items: [item('3500.00', 2), item('3500.00', 1)],
      discountAmount: '0.00',
      taxRate: 0.11,
    })

    expect(result).toMatchObject({
      subtotal: '10500.00',
      discountAmount: '0.00',
      taxAmount: '1155.00',
      totalAmount: '11655.00',
    })
    expect(result.items.map((row) => row.subtotal)).toEqual(['7000.00', '3500.00'])
  })

  it('membulatkan pajak setengah ke atas ke Rupiah penuh', () => {
    const result = calculateTotals({
      items: [item('10.50', 1)],
      discountAmount: '0.00',
      taxRate: 0.05,
    })

    expect(result.taxAmount).toBe('1.00')
    expect(result.totalAmount).toBe('11.50')
  })

  it('membulatkan pajak ke bawah bila di bawah setengah', () => {
    const result = calculateTotals({
      items: [item('10.00', 1)],
      discountAmount: '0.00',
      taxRate: 0.04,
    })

    expect(result.taxAmount).toBe('0.00')
    expect(result.totalAmount).toBe('10.00')
  })

  it('menerapkan diskon transaksi sebelum menghitung pajak', () => {
    const result = calculateTotals({
      items: [item('10000.00', 1)],
      discountAmount: '1000.00',
      taxRate: 0.11,
    })

    expect(result.taxAmount).toBe('990.00')
    expect(result.totalAmount).toBe('9990.00')
  })

  it('menerapkan diskon per item pada subtotal baris', () => {
    const result = calculateTotals({
      items: [item('5000.00', 2, '1000.00')],
      discountAmount: '0.00',
      taxRate: 0,
    })

    expect(result.subtotal).toBe('9000.00')
    expect(result.items[0]?.subtotal).toBe('9000.00')
  })

  it('menggabungkan diskon item, diskon transaksi, dan pajak', () => {
    const result = calculateTotals({
      items: [item('5000.00', 2, '1000.00'), item('2500.00', 1)],
      discountAmount: '500.00',
      taxRate: 0.11,
    })

    expect(result.subtotal).toBe('11500.00')
    expect(result.discountAmount).toBe('500.00')
    expect(result.taxAmount).toBe('1210.00')
    expect(result.totalAmount).toBe('12210.00')
  })
})

describe('calculateChange', () => {
  it('menghitung kembalian tunai', () => {
    expect(
      calculateChange({ method: 'CASH', total: '11655.00', amountPaid: '20000.00' }),
    ).toBe('8345.00')
  })

  it('mengembalikan nol untuk pembayaran non-tunai', () => {
    expect(
      calculateChange({ method: 'QRIS', total: '11655.00', amountPaid: '11655.00' }),
    ).toBe('0.00')
  })
})
