import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ListResult } from '@/types/api'
import type {
  StockOpnameCreatePayload,
  StockOpnameDetail,
  StockOpnameListItem,
  StockOpnameListParams,
  StockOpnameUpdateItemPayload,
} from '@/types/stock-opname'

const mocks = vi.hoisted(() => ({
  list: vi.fn<(params: StockOpnameListParams) => Promise<ListResult<StockOpnameListItem>>>(),
  get: vi.fn<(id: string) => Promise<StockOpnameDetail>>(),
  create: vi.fn<(payload: StockOpnameCreatePayload) => Promise<StockOpnameDetail>>(),
  start: vi.fn<(id: string) => Promise<StockOpnameDetail>>(),
  updateItem:
    vi.fn<
      (
        id: string,
        itemId: string,
        payload: StockOpnameUpdateItemPayload,
      ) => Promise<StockOpnameDetail['items'][number]>
    >(),
  submit: vi.fn<(id: string) => Promise<StockOpnameDetail>>(),
  approve: vi.fn<(id: string) => Promise<StockOpnameDetail>>(),
  reject: vi.fn<(id: string, reason: string) => Promise<StockOpnameDetail>>(),
  complete: vi.fn<(id: string) => Promise<StockOpnameDetail>>(),
  cancel: vi.fn<(id: string) => Promise<StockOpnameDetail>>(),
}))

vi.mock('@/services/stock-opnames.service', () => ({
  stockOpnamesService: {
    list: mocks.list,
    get: mocks.get,
    create: mocks.create,
    start: mocks.start,
    updateItem: mocks.updateItem,
    submit: mocks.submit,
    approve: mocks.approve,
    reject: mocks.reject,
    complete: mocks.complete,
    cancel: mocks.cancel,
  },
}))

const { useStockOpnamesStore } = await import('../stock-opnames.store')

const item: StockOpnameDetail['items'][number] = {
  id: 'item-1',
  product_id: 'product-1',
  sku: 'MKN-001',
  barcode: null,
  name: 'Kopi Susu',
  system_stock: 10,
  physical_stock: null,
  difference: null,
  reason: null,
  counted_by: null,
  counted_at: null,
}

const detail: StockOpnameDetail = {
  id: 'session-1',
  session_number: 'OPN-20261111-ABCD1234',
  name: 'Opname Harian',
  status: 'DRAFT',
  scope: 'ALL',
  notes: null,
  rejection_reason: null,
  created_by: { id: 'admin-1', name: 'Admin' },
  approved_by: null,
  submitted_at: null,
  approved_at: null,
  rejected_at: null,
  completed_at: null,
  created_at: '2026-11-11T03:00:00.000Z',
  updated_at: '2026-11-11T03:00:00.000Z',
  total_items: 1,
  counted_items: 0,
  uncounted_items: 1,
  positive_differences: 0,
  negative_differences: 0,
  zero_differences: 0,
  total_adjustment_quantity: 0,
  items: [item],
}

const listItem: StockOpnameListItem = {
  ...detail,
  total_items: 1,
  counted_items: 0,
}

describe('stock opnames store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('memuat daftar sesi beserta meta', async () => {
    mocks.list.mockResolvedValue({
      items: [listItem],
      meta: { page: 1, limit: 10, total_items: 1, total_pages: 1 },
    })
    const store = useStockOpnamesStore()

    await store.fetchList({ page: 1, limit: 10 })

    expect(store.items).toHaveLength(1)
    expect(store.meta.total_items).toBe(1)
  })

  it('menyimpan error saat daftar gagal dimuat', async () => {
    mocks.list.mockRejectedValue(new Error('network'))
    const store = useStockOpnamesStore()

    await store.fetchList({ page: 1, limit: 10 })

    expect(store.error).toBeTruthy()
  })

  it('membuat sesi dan menyimpan detail', async () => {
    mocks.create.mockResolvedValue(detail)
    const store = useStockOpnamesStore()

    const created = await store.create({ name: 'Opname Harian', scope: 'ALL' })

    expect(created.id).toBe('session-1')
    expect(store.detail?.session_number).toBe('OPN-20261111-ABCD1234')
  })

  it('memperbarui item pada detail setelah hitung', async () => {
    mocks.get.mockResolvedValue(detail)
    mocks.updateItem.mockResolvedValue({
      ...item,
      physical_stock: 8,
      difference: -2,
      counted_by: { id: 'admin-1', name: 'Admin' },
    })
    const store = useStockOpnamesStore()
    await store.fetchDetail('session-1')

    await store.updateItem('session-1', 'item-1', { physical_stock: 8 })

    expect(store.detail?.items[0]).toMatchObject({ physical_stock: 8, difference: -2 })
  })

  it('mengirim reject dengan alasan', async () => {
    mocks.reject.mockResolvedValue({ ...detail, status: 'IN_PROGRESS' })
    const store = useStockOpnamesStore()

    await store.reject('session-1', 'Hitung ulang rak A')

    expect(mocks.reject).toHaveBeenCalledWith('session-1', 'Hitung ulang rak A')
    expect(store.detail?.status).toBe('IN_PROGRESS')
  })

  it('mematikan isSaving setelah aksi selesai', async () => {
    mocks.approve.mockResolvedValue({ ...detail, status: 'APPROVED' })
    const store = useStockOpnamesStore()

    await store.approve('session-1')

    expect(store.isSaving).toBe(false)
    expect(store.detail?.status).toBe('APPROVED')
  })
})