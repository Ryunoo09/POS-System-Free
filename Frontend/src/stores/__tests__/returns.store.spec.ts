import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { ListResult, PaginationMeta } from '@/types/api'
import type { ReturnCreatePayload, ReturnListParams, ReturnRecord } from '@/types/return'

const mocks = vi.hoisted(() => ({
  list: vi.fn<(params: ReturnListParams) => Promise<ListResult<ReturnRecord>>>(),
  create: vi.fn<(payload: ReturnCreatePayload) => Promise<ReturnRecord>>(),
}))

vi.mock('@/services/returns.service', () => ({
  returnsService: {
    list: mocks.list,
    create: mocks.create,
  },
}))

const { useReturnsStore } = await import('../returns.store')

const meta: PaginationMeta = { page: 1, limit: 10, total_items: 1, total_pages: 1 }

const record: ReturnRecord = {
  id: 'ret-1',
  return_number: 'RET-20261106-ABC123',
  status: 'COMPLETED',
  reason: 'Produk rusak',
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
      quantity: 1,
      unit_price: '3500.00',
      subtotal: '3500.00',
      action: 'RESTOCK',
    },
  ],
  created_at: '2026-11-06T03:30:00.000Z',
}

describe('returns.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('memuat daftar retur beserta meta', async () => {
    mocks.list.mockResolvedValue({ items: [record], meta })
    const store = useReturnsStore()

    await store.fetchList({ page: 1, limit: 10 })

    expect(mocks.list).toHaveBeenCalledWith({ page: 1, limit: 10 })
    expect(store.items).toHaveLength(1)
    expect(store.meta.total_items).toBe(1)
  })

  it('menyimpan pesan error saat pemuatan gagal', async () => {
    mocks.list.mockRejectedValue(new Error('gagal'))
    const store = useReturnsStore()

    await store.fetchList({ page: 1, limit: 10 })

    expect(store.items).toHaveLength(0)
    expect(store.error).toBe('Gagal memuat data retur.')
  })

  it('mengambil retur milik satu transaksi tanpa mengubah daftar utama', async () => {
    mocks.list.mockResolvedValue({ items: [record], meta })
    const store = useReturnsStore()

    const result = await store.fetchForTransaction('tx-1')

    expect(mocks.list).toHaveBeenCalledWith({ page: 1, limit: 100, transaction_id: 'tx-1' })
    expect(result).toHaveLength(1)
    expect(store.items).toHaveLength(0)
  })

  it('membuat retur melalui service', async () => {
    mocks.create.mockResolvedValue(record)
    const store = useReturnsStore()

    const result = await store.createReturn({
      transaction_id: 'tx-1',
      reason: 'Produk rusak',
      refund_method: 'CASH',
      items: [{ transaction_item_id: 'tx-item-1', quantity: 1, action: 'RESTOCK' }],
    })

    expect(result.return_number).toBe('RET-20261106-ABC123')
    expect(store.isSaving).toBe(false)
  })
})