import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ListResult } from '@/types/api'
import type { Category } from '@/types/category'
import type { StockOpnameCreatePayload, StockOpnameDetail } from '@/types/stock-opname'
import type { Product } from '@/types/product'
import { useAuthStore } from '@/stores/auth.store'

const mocks = vi.hoisted(() => ({
  push: vi.fn<(path: string) => void>(),
  create: vi.fn<(payload: StockOpnameCreatePayload) => Promise<StockOpnameDetail>>(),
  listProducts: vi.fn<() => Promise<ListResult<Product>>>(),
  listCategories: vi.fn<() => Promise<ListResult<Category>>>(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push }),
  useRoute: () => ({ params: {} }),
}))

vi.mock('@/services/stock-opnames.service', () => ({
  stockOpnamesService: {
    create: mocks.create,
  },
}))

vi.mock('@/services/products.service', () => ({
  productsService: { list: mocks.listProducts },
}))

vi.mock('@/services/categories.service', () => ({
  categoriesService: { list: mocks.listCategories },
}))

const { default: StockOpnameCreatePage } = await import('@/pages/StockOpnameCreatePage.vue')

const product: Product = {
  id: 'product-1',
  sku: 'MKN-001',
  barcode: null,
  name: 'Kopi Susu',
  description: null,
  category: { id: 'cat-1', name: 'Minuman' },
  unit: 'gelas',
  selling_price: '5000.00',
  stock: 10,
  min_stock: 5,
  is_low_stock: false,
  is_active: true,
  created_at: '2026-11-01T00:00:00.000Z',
  updated_at: '2026-11-01T00:00:00.000Z',
}

const detail = {
  id: 'session-1',
  session_number: 'OPN-20261111-ABCD1234',
  status: 'DRAFT',
} as StockOpnameDetail

const mountPage = async () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().user = {
    id: 'admin-1',
    name: 'Admin',
    email: 'admin@pos.local',
    role: 'ADMIN',
    permissions: ['stock_opname:read', 'stock_opname:manage'],
  }

  const wrapper = mount(StockOpnameCreatePage, {
    global: { plugins: [pinia], stubs: { teleport: true } },
  })

  await flushPromises()
  return wrapper
}

const nameInput = (wrapper: Awaited<ReturnType<typeof mountPage>>) =>
  wrapper.find('input[type="text"]')

describe('StockOpnameCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listProducts.mockResolvedValue({
      items: [product],
      meta: { page: 1, limit: 100, total_items: 1, total_pages: 1 },
    } satisfies ListResult<Product>)
    mocks.listCategories.mockResolvedValue({
      items: [],
      meta: { page: 1, limit: 100, total_items: 0, total_pages: 0 },
    })
  })

  it('menolak submit tanpa nama sesi', async () => {
    const wrapper = await mountPage()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Nama sesi wajib diisi')
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('membuat sesi scope ALL lalu pindah ke detail', async () => {
    mocks.create.mockResolvedValue(detail)
    const wrapper = await mountPage()

    await nameInput(wrapper).setValue('Opname Harian')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mocks.create).toHaveBeenCalledWith({ name: 'Opname Harian', scope: 'ALL' })
    expect(mocks.push).toHaveBeenCalledWith('/stock-opnames/session-1')
  })

  it('menampilkan daftar produk saat scope PRODUCT dipilih', async () => {
    const wrapper = await mountPage()

    const scopeSelect = wrapper.find('select')
    await scopeSelect.setValue('PRODUCT')
    await flushPromises()

    expect(wrapper.text()).toContain('Kopi Susu')
  })

  it('menolak submit scope PRODUCT tanpa produk terpilih', async () => {
    const wrapper = await mountPage()
    await wrapper.find('select').setValue('PRODUCT')
    await nameInput(wrapper).setValue('Opname Produk')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Pilih minimal satu produk')
    expect(mocks.create).not.toHaveBeenCalled()
  })
})