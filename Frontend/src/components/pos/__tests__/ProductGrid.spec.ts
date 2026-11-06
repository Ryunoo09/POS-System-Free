import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ProductGrid from '@/components/pos/ProductGrid.vue'
import type { Product } from '@/types/product'

const product = (overrides: Partial<Product> = {}): Product => ({
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
  ...overrides,
})

describe('ProductGrid', () => {
  it('menampilkan produk dan memancarkan event add', async () => {
    const item = product()
    const wrapper = mount(ProductGrid, { props: { products: [item] } })

    expect(wrapper.text()).toContain('Kopi Susu')
    expect(wrapper.text()).toContain('Rp 3.500')

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('add')?.[0]?.[0]).toEqual(item)
  })

  it('menonaktifkan produk yang stoknya habis', () => {
    const wrapper = mount(ProductGrid, {
      props: { products: [product({ stock: 0 })] },
    })

    expect(wrapper.text()).toContain('Habis')
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
  })

  it('menampilkan empty state saat tidak ada produk', () => {
    const wrapper = mount(ProductGrid, { props: { products: [] } })

    expect(wrapper.text()).toContain('Produk tidak ditemukan')
  })

  it('menampilkan error dan memancarkan retry', async () => {
    const wrapper = mount(ProductGrid, {
      props: { products: [], error: 'Gagal memuat produk.' },
    })

    expect(wrapper.text()).toContain('Gagal memuat produk.')

    const retry = wrapper.findAll('button').find((button) => button.text().includes('Coba lagi'))
    await retry?.trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
})
