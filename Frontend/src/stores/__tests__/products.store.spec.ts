import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { ListResult, PaginationMeta } from '@/types/api'
import type {
  BarcodeAssignment,
  Product,
  ProductListParams,
} from '@/types/product'

const mocks = vi.hoisted(() => ({
  list: vi.fn<(params: ProductListParams) => Promise<ListResult<Product>>>(),
  generateBarcode: vi.fn<(id: string) => Promise<BarcodeAssignment>>(),
}))

vi.mock('@/services/products.service', () => ({
  productsService: {
    list: mocks.list,
    create: vi.fn<(payload: unknown) => Promise<Product>>(),
    update: vi.fn<(id: string, payload: unknown) => Promise<Product>>(),
    deactivate: vi.fn<(id: string) => Promise<Product>>(),
    generateBarcode: mocks.generateBarcode,
  },
}))

const { useProductsStore } = await import('../products.store')

const meta: PaginationMeta = { page: 1, limit: 10, total_items: 1, total_pages: 1 }

const product: Product = {
  id: 'product-1',
  sku: 'SKU-1',
  barcode: null,
  name: 'Produk Uji',
  description: null,
  category: { id: 'category-1', name: 'Makanan' },
  unit: 'pcs',
  selling_price: '1500.00',
  stock: 5,
  min_stock: 2,
  is_low_stock: false,
  is_active: true,
  created_at: '2026-11-10T00:00:00.000Z',
  updated_at: '2026-11-10T00:00:00.000Z',
}

describe('products.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('mencari produk berdasarkan barcode aktif', async () => {
    mocks.list.mockResolvedValue({ items: [product], meta })
    const store = useProductsStore()

    const result = await store.findByBarcode('4006381333931')

    expect(mocks.list).toHaveBeenCalledWith({
      page: 1,
      limit: 1,
      barcode: '4006381333931',
      is_active: 'true',
    })
    expect(result?.id).toBe('product-1')
  })

  it('mengembalikan barcode hasil generate', async () => {
    mocks.generateBarcode.mockResolvedValue({ id: 'product-1', barcode: '2001234567893' })
    const store = useProductsStore()

    const barcode = await store.generateBarcode('product-1')

    expect(barcode).toBe('2001234567893')
    expect(store.isSaving).toBe(false)
  })
})