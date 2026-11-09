import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ReceiptView from '@/components/pos/ReceiptView.vue'
import type { TransactionDetail } from '@/types/transaction'

const transaction: TransactionDetail = {
  id: 'tx-1',
  invoice_number: 'INV-20261106-000001',
  status: 'COMPLETED',
  cashier: { id: 'cashier-1', name: 'Kasir Satu' },
  items: [
    {
      id: 'tx-item-1',
      product_id: 'product-1',
      product_name: 'Kopi Susu',
      product_sku: 'MKN-001',
      quantity: 2,
      unit_price: '3500.00',
      discount_amount: '0.00',
      subtotal: '7000.00',
    },
  ],
  subtotal: '7000.00',
  discount_amount: '500.00',
  tax_amount: '715.00',
  total_amount: '7215.00',
  payment_method: 'CASH',
  payment_reference: null,
  amount_paid: '10000.00',
  change_amount: '2785.00',
  created_at: '2026-11-06T03:00:00.000Z',
}

describe('ReceiptView', () => {
  it('menampilkan invoice, item, total, dan pembayaran', () => {
    const wrapper = mount(ReceiptView, { props: { transaction } })

    expect(wrapper.text()).toContain('INV-20261106-000001')
    expect(wrapper.text()).toContain('Kopi Susu')
    expect(wrapper.text()).toContain('2 × Rp 3.500')
    expect(wrapper.text()).toContain('Rp 7.000')
    expect(wrapper.text()).toContain('Rp 7.215')
    expect(wrapper.text()).toContain('Tunai')
    expect(wrapper.text()).toContain('Rp 2.785')
    expect(wrapper.text()).toContain('Kasir Satu')
  })

  it('menyembunyikan baris diskon bila tidak ada diskon', () => {
    const wrapper = mount(ReceiptView, {
      props: { transaction: { ...transaction, discount_amount: '0.00' } },
    })

    expect(wrapper.text()).not.toContain('Diskon')
  })
})
