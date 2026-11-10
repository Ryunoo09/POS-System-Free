import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { ListResult, PaginationMeta } from '@/types/api'
import type {
  PurchaseOrder,
  PurchaseOrderCreatePayload,
  PurchaseOrderListParams,
} from '@/types/purchase'

const mocks = vi.hoisted(() => ({
  list: vi.fn<(params: PurchaseOrderListParams) => Promise<ListResult<PurchaseOrder>>>(),
  create: vi.fn<(payload: PurchaseOrderCreatePayload) => Promise<PurchaseOrder>>(),
  order: vi.fn<(id: string) => Promise<PurchaseOrder>>(),
  receive: vi.fn<(id: string) => Promise<PurchaseOrder>>(),
  cancel: vi.fn<(id: string) => Promise<PurchaseOrder>>(),
}))

vi.mock('@/services/purchases.service', () => ({
  purchasesService: {
    list: mocks.list,
    create: mocks.create,
    order: mocks.order,
    receive: mocks.receive,
    cancel: mocks.cancel,
  },
}))

const { usePurchasesStore } = await import('../purchases.store')

const meta: PaginationMeta = { page: 1, limit: 10, total_items: 1, total_pages: 1 }

const order: PurchaseOrder = {
  id: 'po-1',
  po_number: 'PO-20261110-ABC123',
  status: 'DRAFT',
  total_amount: '40000.00',
  notes: null,
  supplier: { id: 'supplier-1', name: 'PT Sumber Kopi' },
  created_by: { id: 'admin-1', name: 'Admin' },
  items: [
    {
      id: 'poi-1',
      product_id: 'product-1',
      product_name: 'Kopi Susu',
      product_sku: 'MKN-001',
      quantity: 20,
      cost_price: '2000.00',
      subtotal: '40000.00',
    },
  ],
  ordered_at: null,
  received_at: null,
  created_at: '2026-11-10T03:00:00.000Z',
  updated_at: '2026-11-10T03:00:00.000Z',
}

describe('purchases.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('memuat daftar purchase order beserta meta', async () => {
    mocks.list.mockResolvedValue({ items: [order], meta })
    const store = usePurchasesStore()

    await store.fetchPurchaseOrders({ page: 1, limit: 10 })

    expect(mocks.list).toHaveBeenCalledWith({ page: 1, limit: 10 })
    expect(store.items).toHaveLength(1)
    expect(store.meta.total_items).toBe(1)
  })

  it('menyimpan pesan error saat pemuatan gagal', async () => {
    mocks.list.mockRejectedValue(new Error('gagal'))
    const store = usePurchasesStore()

    await store.fetchPurchaseOrders({ page: 1, limit: 10 })

    expect(store.items).toHaveLength(0)
    expect(store.error).toBe('Gagal memuat purchase order.')
  })

  it('menerima barang melalui service', async () => {
    mocks.receive.mockResolvedValue({ ...order, status: 'RECEIVED' })
    const store = usePurchasesStore()

    const result = await store.receivePurchaseOrder('po-1')

    expect(mocks.receive).toHaveBeenCalledWith('po-1')
    expect(result.status).toBe('RECEIVED')
    expect(store.isSaving).toBe(false)
  })
})