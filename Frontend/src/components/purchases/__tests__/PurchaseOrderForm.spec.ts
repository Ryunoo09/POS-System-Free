import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PurchaseOrderForm from '@/components/purchases/PurchaseOrderForm.vue'
import type { PurchaseOrderFormValues } from '@/types/purchase'

const suppliers = [{ id: 'supplier-1', name: 'PT Sumber Kopi' }]
const products = [
  { id: 'product-1', name: 'Kopi Susu', sku: 'MKN-001', cost_price: '2000.00' },
]

const mountForm = () =>
  mount(PurchaseOrderForm, {
    props: {
      open: true,
      suppliers,
      products,
      loading: false,
      fieldErrors: {},
      formError: '',
    },
    global: { stubs: { teleport: true } },
  })

const submitForm = (wrapper: ReturnType<typeof mountForm>) =>
  wrapper.find('#purchase-order-form').trigger('submit')

describe('PurchaseOrderForm', () => {
  it('meminta supplier sebelum submit', async () => {
    const wrapper = mountForm()

    await submitForm(wrapper)

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.text()).toContain('Supplier wajib dipilih')
  })

  it('mengirim payload PO dengan item dan angka terkonversi', async () => {
    const wrapper = mountForm()

    const selects = wrapper.findAll('select')
    await selects[0]!.setValue('supplier-1')
    await selects[1]!.setValue('product-1')

    const inputs = wrapper.findAll('input')
    await inputs[0]!.setValue('5')
    await inputs[1]!.setValue('1500')

    await submitForm(wrapper)

    const payload = wrapper.emitted('submit')?.[0]?.[0] as PurchaseOrderFormValues

    expect(payload.supplier_id).toBe('supplier-1')
    expect(payload.items).toEqual([
      { product_id: 'product-1', quantity: 5, cost_price: 1500 },
    ])
  })

  it('mengisi harga beli otomatis saat produk dipilih', async () => {
    const wrapper = mountForm()

    await wrapper.findAll('select')[1]!.setValue('product-1')

    const inputs = wrapper.findAll('input')
    expect((inputs[1]!.element as HTMLInputElement).value).toBe('2000')
  })
})