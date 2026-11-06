import { describe, expect, it } from 'vitest'
import { calculateCartChange, calculateCartTotals } from '../pricing'

describe('calculateCartTotals', () => {
  it('menghitung pajak 11% dan total sesuai contoh PRD', () => {
    const result = calculateCartTotals({
      items: [
        { unitPrice: '3500.00', quantity: 2 },
        { unitPrice: '3500.00', quantity: 1 },
      ],
      discountAmount: 0,
      taxRate: 0.11,
    })

    expect(result).toEqual({
      subtotal: 10500,
      discountAmount: 0,
      taxAmount: 1155,
      totalAmount: 11655,
    })
  })

  it('membulatkan pajak setengah ke atas ke Rupiah penuh', () => {
    const result = calculateCartTotals({
      items: [{ unitPrice: '10.50', quantity: 1 }],
      discountAmount: 0,
      taxRate: 0.05,
    })

    expect(result.taxAmount).toBe(1)
    expect(result.totalAmount).toBe(11.5)
  })

  it('membulatkan pajak ke bawah bila di bawah setengah', () => {
    const result = calculateCartTotals({
      items: [{ unitPrice: '10.00', quantity: 1 }],
      discountAmount: 0,
      taxRate: 0.04,
    })

    expect(result.taxAmount).toBe(0)
    expect(result.totalAmount).toBe(10)
  })

  it('menerapkan diskon transaksi sebelum menghitung pajak', () => {
    const result = calculateCartTotals({
      items: [{ unitPrice: '10000.00', quantity: 1 }],
      discountAmount: 1000,
      taxRate: 0.11,
    })

    expect(result.taxAmount).toBe(990)
    expect(result.totalAmount).toBe(9990)
  })

  it('menggabungkan beberapa item, diskon, dan pajak', () => {
    const result = calculateCartTotals({
      items: [
        { unitPrice: '5000.00', quantity: 2 },
        { unitPrice: '2500.00', quantity: 1 },
      ],
      discountAmount: 500,
      taxRate: 0.11,
    })

    expect(result).toEqual({
      subtotal: 12500,
      discountAmount: 500,
      taxAmount: 1320,
      totalAmount: 13320,
    })
  })
})

describe('calculateCartChange', () => {
  it('menghitung kembalian tunai', () => {
    expect(calculateCartChange({ method: 'CASH', total: 11655, amountPaid: 20000 })).toBe(
      8345,
    )
  })

  it('tidak memberi kembalian untuk pembayaran non-tunai', () => {
    expect(calculateCartChange({ method: 'QRIS', total: 11655, amountPaid: 11655 })).toBe(0)
  })
})
