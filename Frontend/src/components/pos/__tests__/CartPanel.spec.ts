import { mount, type VueWrapper } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CartPanel from '@/components/pos/CartPanel.vue'
import type { CartItem } from '@/types/cart'
import type { Product } from '@/types/product'

const product: Product = {
  id: 'product-1',
  sku: 'MKN-001',
  barcode: null,
  name: 'Kopi Susu',
  description: null,
  category: { id: 'cat-1', name: 'Minuman' },
  unit: 'gelas',
  cost_price: '3000.00',
  selling_price: '3500.00',
  stock: 10,
  min_stock: 1,
  is_low_stock: false,
  is_active: true,
  created_at: '2026-11-01T00:00:00.000Z',
  updated_at: '2026-11-01T00:00:00.000Z',
}

const item: CartItem = { product, quantity: 2 }

const baseProps = {
  items: [item],
  subtotal: 7000,
  discountInput: 0,
  discount: 0,
  taxAmount: 0,
  totalAmount: 7000,
}

const inputByLabel = (wrapper: VueWrapper, label: string) => {
  const labelElement = wrapper.findAll('label').find((entry) => entry.text().includes(label))
  const inputId = labelElement?.attributes('for')

  if (!inputId) throw new Error(`Input dengan label "${label}" tidak ditemukan`)

  return wrapper.get(`#${inputId}`)
}

describe('CartPanel', () => {
  it('menampilkan item, subtotal, dan total', () => {
    const wrapper = mount(CartPanel, { props: baseProps })

    expect(wrapper.text()).toContain('Kopi Susu')
    expect(wrapper.text()).toContain('Rp 7.000')
    expect(wrapper.text()).toContain('Maks 10')
  })

  it('memancarkan increment, decrement, dan remove', async () => {
    const wrapper = mount(CartPanel, { props: baseProps })

    await wrapper.get('[aria-label="Tambah jumlah Kopi Susu"]').trigger('click')
    await wrapper.get('[aria-label="Kurangi jumlah Kopi Susu"]').trigger('click')
    await wrapper.get('[aria-label="Hapus Kopi Susu"]').trigger('click')

    expect(wrapper.emitted('increment')?.[0]).toEqual(['product-1'])
    expect(wrapper.emitted('decrement')?.[0]).toEqual(['product-1'])
    expect(wrapper.emitted('remove')?.[0]).toEqual(['product-1'])
  })

  it('memancarkan kuantitas baru dari input jumlah', async () => {
    const wrapper = mount(CartPanel, { props: baseProps })
    const input = wrapper.get('input[type="number"]')

    await input.setValue('3')
    await input.trigger('change')

    expect(wrapper.emitted('update-quantity')?.[0]).toEqual(['product-1', 3])
  })

  it('memancarkan diskon transaksi', async () => {
    const wrapper = mount(CartPanel, { props: baseProps })

    await inputByLabel(wrapper, 'Diskon transaksi').setValue('1000')

    expect(wrapper.emitted('update:discount')?.[0]).toEqual([1000])
  })

  it('menampilkan error diskon dan item error', () => {
    const wrapper = mount(CartPanel, {
      props: {
        ...baseProps,
        discountInput: 9000,
        discount: 7000,
        discountError: 'Diskon melebihi subtotal',
        itemErrors: { 'product-1': 'Stok tidak mencukupi' },
      },
    })

    expect(wrapper.text()).toContain('Diskon melebihi subtotal')
    expect(wrapper.text()).toContain('Stok tidak mencukupi')
  })

  it('menampilkan empty state dan menyembunyikan tombol kosongkan', () => {
    const wrapper = mount(CartPanel, {
      props: { ...baseProps, items: [], subtotal: 0, totalAmount: 0 },
    })

    expect(wrapper.text()).toContain('Keranjang kosong')
    expect(wrapper.findAll('button').some((button) => button.text() === 'Kosongkan')).toBe(false)
  })

  it('memancarkan clear saat tombol kosongkan diklik', async () => {
    const wrapper = mount(CartPanel, { props: baseProps })

    await wrapper.findAll('button').find((button) => button.text() === 'Kosongkan')?.trigger('click')

    expect(wrapper.emitted('clear')).toHaveLength(1)
  })
})
