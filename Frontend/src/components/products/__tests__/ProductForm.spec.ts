import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import ProductForm from '@/components/products/ProductForm.vue'
import type { Product, ProductFormValues } from '@/types/product'

const product: Product = {
  id: 'product-1',
  sku: 'MKN-001',
  barcode: '12345678',
  name: 'Kopi Susu',
  description: 'Kopi susu gula aren',
  category: { id: 'cat-1', name: 'Minuman' },
  unit: 'gelas',
  cost_price: '3000.00',
  selling_price: '5000.00',
  stock: 10,
  min_stock: 2,
  is_low_stock: false,
  is_active: true,
  created_at: '2026-11-01T00:00:00.000Z',
  updated_at: '2026-11-01T00:00:00.000Z',
}

const categories = [{ value: 'cat-1', label: 'Minuman' }]

const RouterLinkStub = defineComponent({
  setup(_, { slots }) {
    return () => h('a', {}, slots.default?.())
  },
})

const mountForm = (options: { product?: Product | null } = {}) =>
  mount(ProductForm, {
    props: {
      open: true,
      product: options.product === undefined ? product : options.product,
      categories,
    },
    global: {
      stubs: {
        teleport: true,
        RouterLink: RouterLinkStub,
      },
    },
  })

const inputByLabel = (wrapper: VueWrapper, label: string) => {
  const labelElement = wrapper.findAll('label').find((item) => item.text().includes(label))
  const inputId = labelElement?.attributes('for')

  if (!inputId) throw new Error(`Input dengan label "${label}" tidak ditemukan`)

  return wrapper.get(`#${inputId}`)
}

describe('ProductForm', () => {
  it('menampilkan stok read-only dan tautan Inventori saat mengubah produk', () => {
    const wrapper = mountForm()

    expect(wrapper.text()).toContain('Stok saat ini')
    expect(wrapper.text()).toContain('Buka halaman Inventori')
    expect(wrapper.text()).not.toContain('Stok awal')
  })

  it('menampilkan field stok awal saat membuat produk baru', () => {
    const wrapper = mountForm({ product: null })

    expect(wrapper.text()).toContain('Stok awal')
    expect(wrapper.text()).not.toContain('Stok saat ini')
  })

  it('menolak harga jual negatif tanpa mengirim form', async () => {
    const wrapper = mountForm()

    await inputByLabel(wrapper, 'Harga jual').setValue('-1')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.text()).toContain('Harga jual tidak boleh negatif')
  })

  it('menampilkan peringatan non-blokir saat harga jual di bawah harga modal', async () => {
    const wrapper = mountForm()

    await inputByLabel(wrapper, 'Harga jual').setValue('1000')

    expect(wrapper.text()).toContain('Harga jual lebih rendah dari harga modal')
  })

  it('mengirim nilai form yang sudah divalidasi', async () => {
    const wrapper = mountForm()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const emitted = wrapper.emitted('submit')

    expect(emitted).toHaveLength(1)

    const values = emitted?.[0]?.[0] as ProductFormValues
    expect(values).toMatchObject({
      sku: 'MKN-001',
      name: 'Kopi Susu',
      category_id: 'cat-1',
      cost_price: 3000,
      selling_price: 5000,
      stock: 10,
      min_stock: 2,
    })
  })
})