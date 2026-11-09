import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CheckoutSuccessDialog from '@/components/pos/CheckoutSuccessDialog.vue'
import type { TransactionDetail } from '@/types/transaction'

const transaction: TransactionDetail = {
  id: 'tx-1',
  invoice_number: 'INV-20261106-000001',
  status: 'COMPLETED',
  cashier: { id: 'cashier-1', name: 'Kasir Satu' },
  items: [
    {
      product_id: 'product-1',
      product_name: 'Kopi Susu',
      product_sku: 'MKN-001',
      quantity: 1,
      unit_price: '3500.00',
      discount_amount: '0.00',
      subtotal: '3500.00',
    },
  ],
  subtotal: '3500.00',
  discount_amount: '0.00',
  tax_amount: '0.00',
  total_amount: '3500.00',
  payment_method: 'CASH',
  payment_reference: null,
  amount_paid: '5000.00',
  change_amount: '1500.00',
  created_at: '2026-11-06T03:00:00.000Z',
}

const mountDialog = (autoPrint = true) =>
  mount(CheckoutSuccessDialog, {
    props: { open: true, transaction, autoPrint },
    global: { stubs: { teleport: true } },
  })

describe('CheckoutSuccessDialog', () => {
  let print: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    print = vi.spyOn(window, 'print').mockImplementation(() => {})
  })

  afterEach(() => {
    print.mockRestore()
  })

  it('menampilkan total, kembalian, dan struk', () => {
    const wrapper = mountDialog()

    expect(wrapper.text()).toContain('Transaksi berhasil')
    expect(wrapper.text()).toContain('Rp 3.500')
    expect(wrapper.text()).toContain('Rp 1.500')
    expect(wrapper.text()).toContain('INV-20261106-000001')
  })

  it('memancarkan new-transaction', async () => {
    const wrapper = mountDialog()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Transaksi Baru')
      ?.trigger('click')

    expect(wrapper.emitted('new-transaction')).toHaveLength(1)
  })

  it('mencetak struk lewat window.print saat tombol diklik', async () => {
    const wrapper = mountDialog()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Cetak Struk')
      ?.trigger('click')

    expect(print).toHaveBeenCalledTimes(1)
  })

  it('memancarkan update:autoPrint saat toggle diubah', async () => {
    const wrapper = mountDialog(true)

    await wrapper.find('input[type="checkbox"]').setValue(false)

    expect(wrapper.emitted('update:autoPrint')).toEqual([[false]])
  })
})