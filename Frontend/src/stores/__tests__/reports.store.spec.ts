import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { DateRange } from '@/types/dashboard'
import type {
  CashierReportRow,
  CogsReportPayload,
  InventoryValuationPayload,
  ProductReportParams,
  ProductReportPayload,
  ReportPayload,
  SalesReportParams,
  SalesReportRow,
  ValuationParams,
} from '@/types/report'

const mocks = vi.hoisted(() => ({
  getSales: vi.fn<(params: SalesReportParams) => Promise<ReportPayload<SalesReportRow>>>(),
  getProducts: vi.fn<(params: ProductReportParams) => Promise<ProductReportPayload>>(),
  getCashiers: vi.fn<(params: DateRange) => Promise<ReportPayload<CashierReportRow>>>(),
  getInventoryValuation:
    vi.fn<(params: ValuationParams) => Promise<InventoryValuationPayload>>(),
  getCogs: vi.fn<(params: DateRange) => Promise<CogsReportPayload>>(),
}))

vi.mock('@/services/reports.service', () => ({
  reportsService: {
    getSales: mocks.getSales,
    getProducts: mocks.getProducts,
    getCashiers: mocks.getCashiers,
    getInventoryValuation: mocks.getInventoryValuation,
    getCogs: mocks.getCogs,
  },
}))

const { useReportsStore } = await import('../reports.store')

const range: DateRange = { start_date: '2026-11-01', end_date: '2026-11-30' }

const summary = {
  revenue: '140000.00',
  cogs: '80000.00',
  gross_profit: '60000.00',
  gross_margin_pct: '42.86',
  transaction_count: 2,
}

const salesRow: SalesReportRow = {
  period: '2026-11-01',
  period_label: '1 Nov 2026',
  transaction_count: 1,
  revenue: '90000.00',
  cogs: '60000.00',
  gross_profit: '30000.00',
  gross_margin_pct: '33.33',
}

describe('reports.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mocks.getSales.mockResolvedValue({ summary, rows: [salesRow] })
    mocks.getProducts.mockResolvedValue({
      summary,
      rows: [],
      meta: { page: 1, limit: 10, total_items: 0, total_pages: 0 },
    })
    mocks.getCashiers.mockResolvedValue({ summary, rows: [] })
    mocks.getInventoryValuation.mockResolvedValue({
      total_value: '0.00',
      total_quantity: 0,
      items: [],
      by_category: [],
    })
    mocks.getCogs.mockResolvedValue({ summary, rows: [] })
  })

  it('memuat laporan penjualan dan menyimpan ringkasan', async () => {
    const store = useReportsStore()

    await store.loadSales({ ...range, group_by: 'weekly' })

    expect(mocks.getSales).toHaveBeenCalledWith({ ...range, group_by: 'weekly' })
    expect(store.sales).toHaveLength(1)
    expect(store.summary?.revenue).toBe('140000.00')
    expect(store.salesLoading).toBe(false)
  })

  it('memuat laporan produk beserta meta pagination', async () => {
    mocks.getProducts.mockResolvedValue({
      summary,
      rows: [
        {
          product_id: 'product-1',
          sku: 'SKU-1',
          name: 'Kopi',
          category: 'Minuman',
          quantity_sold: 3,
          revenue: '30000.00',
          cogs: '15000.00',
          gross_profit: '15000.00',
          gross_margin_pct: '50.00',
        },
      ],
      meta: { page: 2, limit: 10, total_items: 21, total_pages: 3 },
    })
    const store = useReportsStore()

    await store.loadProducts({ ...range, sort: 'profit', page: 2, limit: 10 })

    expect(store.products).toHaveLength(1)
    expect(store.productsMeta.page).toBe(2)
    expect(store.productsMeta.total_items).toBe(21)
  })

  it('memuat laporan kasir', async () => {
    mocks.getCashiers.mockResolvedValue({
      summary,
      rows: [
        {
          cashier_id: 'cashier-1',
          cashier_name: 'Kasir Satu',
          transaction_count: 2,
          revenue: '140000.00',
          gross_profit: '60000.00',
          average_transaction: '70000.00',
        },
      ],
    })
    const store = useReportsStore()

    await store.loadCashiers(range)

    expect(store.cashiers[0]?.cashier_name).toBe('Kasir Satu')
  })

  it('menyimpan pesan error saat laporan gagal dimuat', async () => {
    mocks.getSales.mockRejectedValue(new Error('network'))
    const store = useReportsStore()

    await store.loadSales({ ...range, group_by: 'daily' })

    expect(store.sales).toHaveLength(0)
    expect(store.salesError).toBe('Gagal memuat laporan penjualan.')
  })

  it('memuat valuasi inventaris', async () => {
    mocks.getInventoryValuation.mockResolvedValue({
      total_value: '500000.00',
      total_quantity: 100,
      items: [
        {
          product_id: 'product-1',
          sku: 'SKU-1',
          name: 'Kopi Susu',
          category: 'Minuman',
          stock: 100,
          average_cost: '5000.00',
          inventory_value: '500000.00',
        },
      ],
      by_category: [
        { category_id: 'cat-1', category: 'Minuman', quantity: 100, value: '500000.00' },
      ],
    })
    const store = useReportsStore()

    await store.loadValuation({})

    expect(store.valuation?.total_value).toBe('500000.00')
    expect(store.valuation?.items).toHaveLength(1)
    expect(store.valuationLoading).toBe(false)
  })

  it('memuat laporan laba per kategori', async () => {
    mocks.getCogs.mockResolvedValue({
      summary,
      rows: [
        {
          category_id: 'cat-1',
          category: 'Minuman',
          quantity_sold: 5,
          revenue: '100000.00',
          cogs: '60000.00',
          gross_profit: '40000.00',
          gross_margin_pct: '40.00',
        },
      ],
    })
    const store = useReportsStore()

    await store.loadCogs(range)

    expect(store.cogs).toHaveLength(1)
    expect(store.cogs[0]?.gross_margin_pct).toBe('40.00')
  })

  it('memuat seluruh tab sekaligus', async () => {
    const store = useReportsStore()

    await store.loadAll({
      range,
      groupBy: 'daily',
      sort: 'best_selling',
      categoryId: '',
      page: 1,
      limit: 10,
    })

    expect(mocks.getSales).toHaveBeenCalledOnce()
    expect(mocks.getProducts).toHaveBeenCalledOnce()
    expect(mocks.getCashiers).toHaveBeenCalledOnce()
    expect(mocks.getInventoryValuation).toHaveBeenCalledOnce()
    expect(mocks.getCogs).toHaveBeenCalledOnce()
  })
})
