import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { ListResult } from '@/types/api'
import type {
  AdjustStockPayload,
  AdjustStockResult,
  InventoryListParams,
  InventoryProduct,
  LowStockParams,
  MovementListParams,
  StockMovement,
} from '@/types/inventory'
import type { Product } from '@/types/product'

const mocks = vi.hoisted(() => ({
  list: vi.fn<(params: InventoryListParams) => Promise<ListResult<InventoryProduct>>>(),
  listLowStock: vi.fn<(params: LowStockParams) => Promise<ListResult<Product>>>(),
  listMovements:
    vi.fn<(params: MovementListParams) => Promise<ListResult<StockMovement>>>(),
  adjust: vi.fn<(payload: AdjustStockPayload) => Promise<AdjustStockResult>>(),
}))

vi.mock('@/services/inventory.service', () => ({
  inventoryService: {
    list: mocks.list,
    listLowStock: mocks.listLowStock,
    listMovements: mocks.listMovements,
    adjust: mocks.adjust,
  },
}))

const { useInventoryStore } = await import('../inventory.store')

const meta = { page: 1, limit: 10, total_items: 1, total_pages: 1 }

const product: Product = {
  id: 'product-1',
  sku: 'MKN-001',
  barcode: null,
  name: 'Kopi Susu',
  description: null,
  category: { id: 'cat-1', name: 'Minuman' },
  unit: 'gelas',
  cost_price: '3000.00',
  selling_price: '5000.00',
  stock: 10,
  min_stock: 5,
  is_low_stock: false,
  is_active: true,
  created_at: '2026-11-01T00:00:00.000Z',
  updated_at: '2026-11-01T00:00:00.000Z',
}

const inventoryProduct: InventoryProduct = { ...product, stock_value: '30000.00' }

const movement: StockMovement = {
  id: 'movement-1',
  product: { id: 'product-1', sku: 'MKN-001', name: 'Kopi Susu' },
  movement_type: 'PURCHASE',
  quantity: 5,
  stock_before: 10,
  stock_after: 15,
  reference_type: 'MANUAL',
  reference_id: null,
  invoice_number: null,
  notes: 'Pembelian supplier',
  created_by: { id: 'admin-1', name: 'Admin' },
  created_at: '2026-11-06T00:00:00.000Z',
}

describe('inventory.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('memuat daftar stok beserta meta pagination', async () => {
    mocks.list.mockResolvedValue({ items: [inventoryProduct], meta })
    const store = useInventoryStore()

    await store.fetchStock({ page: 1, limit: 10, search: 'MKN' })

    expect(mocks.list).toHaveBeenCalledWith({ page: 1, limit: 10, search: 'MKN' })
    expect(store.stockItems).toHaveLength(1)
    expect(store.stockItems[0]?.stock_value).toBe('30000.00')
    expect(store.stockMeta.total_items).toBe(1)
    expect(store.stockLoading).toBe(false)
  })

  it('menyimpan pesan error saat gagal memuat stok', async () => {
    mocks.list.mockRejectedValue(new Error('network'))
    const store = useInventoryStore()

    await store.fetchStock({ page: 1, limit: 10 })

    expect(store.stockItems).toHaveLength(0)
    expect(store.stockError).toBe('Gagal memuat data stok.')
    expect(store.stockLoading).toBe(false)
  })

  it('memuat stok rendah dan riwayat pergerakan', async () => {
    mocks.listLowStock.mockResolvedValue({ items: [product], meta })
    mocks.listMovements.mockResolvedValue({ items: [movement], meta })
    const store = useInventoryStore()

    await store.fetchLowStock({ page: 1, limit: 10 })
    await store.fetchMovements({ page: 1, limit: 10, movement_type: 'PURCHASE' })

    expect(store.lowStockItems[0]?.id).toBe('product-1')
    expect(store.movementItems[0]?.quantity).toBe(5)
    expect(mocks.listMovements).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      movement_type: 'PURCHASE',
    })
  })

  it('mengabaikan respons riwayat yang datang terlambat', async () => {
    let resolveFirst: (value: ListResult<StockMovement>) => void = () => {}
    const first = new Promise<ListResult<StockMovement>>((resolve) => {
      resolveFirst = resolve
    })
    mocks.listMovements
      .mockReturnValueOnce(first)
      .mockResolvedValueOnce({
        items: [{ ...movement, id: 'movement-2', quantity: 7 }],
        meta,
      })

    const store = useInventoryStore()
    const pending = store.fetchMovements({ page: 1, limit: 10 })
    await store.fetchMovements({ page: 1, limit: 10, movement_type: 'PURCHASE' })
    resolveFirst({ items: [movement], meta })
    await pending

    expect(store.movementItems.map((item) => item.id)).toEqual(['movement-2'])
  })

  it('meneruskan payload penyesuaian ke service', async () => {
    const result: AdjustStockResult = {
      movement,
      product: { id: 'product-1', sku: 'MKN-001', stock: 15 },
    }
    mocks.adjust.mockResolvedValue(result)
    const store = useInventoryStore()

    const payload: AdjustStockPayload = {
      product_id: 'product-1',
      movement_type: 'PURCHASE',
      quantity: 5,
      notes: 'Pembelian supplier',
    }

    const adjusted = await store.adjust(payload)

    expect(mocks.adjust).toHaveBeenCalledWith(payload)
    expect(adjusted.product.stock).toBe(15)
    expect(store.isSaving).toBe(false)
  })
})