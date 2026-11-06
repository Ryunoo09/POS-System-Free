import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { ListResult } from '@/types/api'
import type {
  TransactionCashierOption,
  TransactionDetail,
  TransactionListParams,
  TransactionSummary,
} from '@/types/transaction'
import { ApiError } from '@/utils/api-error'

const mocks = vi.hoisted(() => ({
  list: vi.fn<(params: TransactionListParams) => Promise<ListResult<TransactionSummary>>>(),
  detail: vi.fn<(id: string) => Promise<TransactionDetail>>(),
  cashiers: vi.fn<() => Promise<TransactionCashierOption[]>>(),
}))

vi.mock('@/services/transactions.service', () => ({
  transactionsService: {
    list: mocks.list,
    detail: mocks.detail,
    cashiers: mocks.cashiers,
  },
}))

const { useTransactionsStore } = await import('../transactions.store')

const meta = { page: 1, limit: 10, total_items: 1, total_pages: 1 }

const summary: TransactionSummary = {
  id: 'tx-1',
  invoice_number: 'INV-20261106-000001',
  cashier: { id: 'cashier-1', name: 'Kasir Satu' },
  status: 'COMPLETED',
  subtotal: '7000.00',
  discount_amount: '0.00',
  tax_amount: '0.00',
  total_amount: '7000.00',
  payment_method: 'CASH',
  item_count: 1,
  created_at: '2026-11-06T03:00:00.000Z',
}

const detail: TransactionDetail = {
  ...summary,
  items: [
    {
      product_id: 'product-1',
      product_name: 'Kopi Susu',
      product_sku: 'MKN-001',
      quantity: 2,
      unit_price: '3500.00',
      unit_cost: '2000.00',
      discount_amount: '0.00',
      subtotal: '7000.00',
    },
  ],
  payment_reference: null,
  amount_paid: '10000.00',
  change_amount: '3000.00',
}

describe('transactions.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('memuat daftar transaksi beserta meta pagination', async () => {
    mocks.list.mockResolvedValue({ items: [summary], meta })
    const store = useTransactionsStore()
    const params: TransactionListParams = {
      page: 2,
      limit: 10,
      status: 'COMPLETED',
      search: 'INV',
    }

    await store.fetchList(params)

    expect(mocks.list).toHaveBeenCalledWith(params)
    expect(store.items).toHaveLength(1)
    expect(store.meta.page).toBe(1)
    expect(store.isLoading).toBe(false)
  })

  it('menyimpan pesan error saat daftar gagal dimuat', async () => {
    mocks.list.mockRejectedValue(new Error('network'))
    const store = useTransactionsStore()

    await store.fetchList({ page: 1, limit: 10 })

    expect(store.items).toHaveLength(0)
    expect(store.error).toBe('Gagal memuat transaksi.')
    expect(store.isLoading).toBe(false)
  })

  it('memuat detail transaksi', async () => {
    mocks.detail.mockResolvedValue(detail)
    const store = useTransactionsStore()

    await store.fetchDetail('tx-1')

    expect(mocks.detail).toHaveBeenCalledWith('tx-1')
    expect(store.detail?.invoice_number).toBe('INV-20261106-000001')
    expect(store.detailError).toBe('')
    expect(store.detailNotFound).toBe(false)
  })

  it('menandai detail yang tidak ditemukan', async () => {
    mocks.detail.mockRejectedValue(new ApiError('Transaksi tidak ditemukan', 404, 'NOT_FOUND'))
    const store = useTransactionsStore()

    await store.fetchDetail('tx-1')

    expect(store.detail).toBeNull()
    expect(store.detailNotFound).toBe(true)
    expect(store.detailLoading).toBe(false)
  })

  it('memuat opsi kasir', async () => {
    mocks.cashiers.mockResolvedValue([{ id: 'cashier-1', name: 'Kasir Satu' }])
    const store = useTransactionsStore()

    await store.fetchCashiers()

    expect(store.cashiers).toEqual([{ id: 'cashier-1', name: 'Kasir Satu' }])
    expect(store.cashiersLoading).toBe(false)
  })
})
