import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ReturnRequestDialog from '@/components/returns/ReturnRequestDialog.vue'
import type { ReturnCreatePayload, ReturnRecord } from '@/types/return'
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
  discount_amount: '0.00',
  tax_amount: '0.00',
  total_amount: '7000.00',
  payment_method: 'CASH',
  payment_reference: null,
  amount_paid: '7000.00',
  change_amount: '0.00',
  created_at: '2026-11-06T03:00:00.000Z',
}

const existingReturn = (quantity: number): ReturnRecord => ({
  id: 'ret-1',
  return_number: 'RET-20261106-ABC123',
  status: 'COMPLETED',
  reason: 'Rusak',
  refund_amount: '3500.00',
  refund_method: 'CASH',
  cashier: { id: 'cashier-1', name: 'Kasir Satu' },
  transaction: { id: 'tx-1', invoice_number: 'INV-20261106-000001' },
  items: [
    {
      id: 'ri-1',
      transaction_item_id: 'tx-item-1',
      product_id: 'product-1',
      product_name: 'Kopi Susu',
      product_sku: 'MKN-001',
      quantity,
      unit_price: '3500.00',
      subtotal: '3500.00',
      action: 'RESTOCK',
    },
  ],
  created_at: '2026-11-06T03:30:00.000Z',
})

const mountDialog = (existingReturns: ReturnRecord[] = []) =>
  mount(ReturnRequestDialog, {
    props: {
      open: true,
      transaction,
      existingReturns,
      loadingExisting: false,
      isSaving: false,
      serverError: '',
    },
    global: { stubs: { teleport: true } },
  })

const findButton = (wrapper: ReturnType<typeof mountDialog>, label: string) =>
  wrapper.findAll('button').find((button) => button.text() === label)

describe('ReturnRequestDialog', () => {
  it('meminta minimal satu item sebelum submit', async () => {
    const wrapper = mountDialog()

    await findButton(wrapper, 'Proses Retur')?.trigger('click')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.text()).toContain('Pilih minimal satu item untuk diretur.')
  })

  it('mengirim payload retur dengan item terpilih', async () => {
    const wrapper = mountDialog()

    await wrapper.find('input[type="checkbox"]').setValue(true)
    await wrapper.find('input[type="number"]').setValue('1')
    await wrapper.find('textarea').setValue('Produk rusak')

    await findButton(wrapper, 'Proses Retur')?.trigger('click')

    const payload = wrapper.emitted('submit')?.[0]?.[0] as ReturnCreatePayload

    expect(payload).toEqual({
      transaction_id: 'tx-1',
      reason: 'Produk rusak',
      refund_method: 'CASH',
      items: [{ transaction_item_id: 'tx-item-1', quantity: 1, action: 'RESTOCK' }],
    })
  })

  it('menampilkan estimasi refund dan menandai item yang sudah diretur', async () => {
    const available = mountDialog()
    await available.find('input[type="checkbox"]').setValue(true)
    expect(available.text()).toContain('Rp 3.500')

    const fullyReturned = mountDialog([existingReturn(2)])
    expect(fullyReturned.text()).toContain('Semua item pada transaksi ini sudah diretur.')
  })
})