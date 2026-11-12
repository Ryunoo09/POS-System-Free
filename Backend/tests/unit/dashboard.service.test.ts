import { describe, expect, it } from 'vitest'
import type { ReportRepository } from '../../src/repositories/report.repository.js'
import { createDashboardService } from '../../src/services/dashboard.service.js'

const buildRepository = (overrides: Partial<ReportRepository> = {}): ReportRepository => ({
  getSummary: async () => ({
    revenue: '0.00',
    cogs: '0.00',
    grossProfit: '0.00',
    transactionCount: 0,
    totalProducts: 0,
    totalStock: 0,
    lowStockCount: 0,
  }),
  getDailySales: async () => [],
  getTopProducts: async () => [],
  getPeriodSales: async () => [],
  listProductSales: async () => ({ items: [], total: 0 }),
  listCashierSales: async () => [],
  getPaymentMethodSales: async () => [],
  getCategorySales: async () => [],
  getInventoryValuation: async () => ({
    totalValue: '0.00',
    totalQuantity: 0,
    items: [],
    byCategory: [],
  }),
  getCategoryCogs: async () => [],
  ...overrides,
})

describe('DashboardService.getSummary', () => {
  it('memetakan total dan period ke bentuk API', async () => {
    const service = createDashboardService({
      reportRepository: buildRepository({
        getSummary: async () => ({
          revenue: '140000.00',
          cogs: '80000.00',
          grossProfit: '60000.00',
          transactionCount: 2,
          totalProducts: 2,
          totalStock: 12,
          lowStockCount: 1,
        }),
      }),
    })

    const result = await service.getSummary({
      start_date: '2026-11-01',
      end_date: '2026-11-03',
    })

    expect(result).toEqual({
      period: { start_date: '2026-11-01', end_date: '2026-11-03' },
      revenue: '140000.00',
      cogs: '80000.00',
      gross_profit: '60000.00',
      gross_margin_pct: '42.86',
      transaction_count: 2,
      total_products: 2,
      total_stock: 12,
      low_stock_count: 1,
      previous: {
        period: { start_date: '2026-10-29', end_date: '2026-10-31' },
        revenue: '140000.00',
        cogs: '80000.00',
        gross_profit: '60000.00',
        transaction_count: 2,
      },
    })
  })

  it('memakai jendela durasi sama tepat sebelum periode untuk delta', async () => {
    const ranges: Array<{ startDate: string; endDate: string }> = []
    const service = createDashboardService({
      reportRepository: buildRepository({
        getSummary: async (range) => {
          ranges.push({ startDate: range.startDate, endDate: range.endDate })

          return {
            revenue: range.startDate === '2026-11-01' ? '140000.00' : '70000.00',
            cogs: '0.00',
            grossProfit: '0.00',
            transactionCount: range.startDate === '2026-11-01' ? 2 : 1,
            totalProducts: 0,
            totalStock: 0,
            lowStockCount: 0,
          }
        },
      }),
    })

    const result = await service.getSummary({
      start_date: '2026-11-01',
      end_date: '2026-11-03',
    })

    expect(ranges).toEqual([
      { startDate: '2026-11-01', endDate: '2026-11-03' },
      { startDate: '2026-10-29', endDate: '2026-10-31' },
    ])
    expect(result.previous).toEqual({
      period: { start_date: '2026-10-29', end_date: '2026-10-31' },
      revenue: '70000.00',
      cogs: '0.00',
      gross_profit: '0.00',
      transaction_count: 1,
    })
  })

  it('menghitung jendela sebelumnya untuk periode satu hari', async () => {
    const ranges: string[] = []
    const service = createDashboardService({
      reportRepository: buildRepository({
        getSummary: async (range) => {
          ranges.push(`${range.startDate}..${range.endDate}`)

          return {
            revenue: '0.00',
            cogs: '0.00',
            grossProfit: '0.00',
            transactionCount: 0,
            totalProducts: 0,
            totalStock: 0,
            lowStockCount: 0,
          }
        },
      }),
    })

    await service.getSummary({ start_date: '2026-11-06', end_date: '2026-11-06' })

    expect(ranges).toEqual(['2026-11-06..2026-11-06', '2026-11-05..2026-11-05'])
  })
})

describe('DashboardService.getSales', () => {
  it('mengisi hari tanpa transaksi dengan 0 dan urut naik', async () => {
    const service = createDashboardService({
      reportRepository: buildRepository({
        getDailySales: async () => [
          { date: '2026-11-02', revenue: '50000.00', transactionCount: 1 },
        ],
      }),
    })

    const result = await service.getSales({
      start_date: '2026-11-01',
      end_date: '2026-11-03',
    })

    expect(result).toEqual([
      { date: '2026-11-01', revenue: '0.00', transaction_count: 0 },
      { date: '2026-11-02', revenue: '50000.00', transaction_count: 1 },
      { date: '2026-11-03', revenue: '0.00', transaction_count: 0 },
    ])
  })
})

describe('DashboardService.getTopProducts', () => {
  it('memetakan produk terlaris ke bentuk API', async () => {
    const service = createDashboardService({
      reportRepository: buildRepository({
        getTopProducts: async () => [
          {
            productId: 'product-a',
            sku: 'DASH-A',
            name: 'Produk A',
            quantitySold: 2,
            revenue: '100000.00',
          },
        ],
      }),
    })

    const result = await service.getTopProducts(
      { start_date: '2026-11-01', end_date: '2026-11-03' },
      5,
    )

    expect(result).toEqual([
      {
        product_id: 'product-a',
        sku: 'DASH-A',
        name: 'Produk A',
        quantity_sold: 2,
        revenue: '100000.00',
      },
    ])
  })
})

describe('DashboardService.getBreakdown', () => {
  it('memetakan metode pembayaran dan kategori ke bentuk API', async () => {
    const service = createDashboardService({
      reportRepository: buildRepository({
        getPaymentMethodSales: async () => [
          { paymentMethod: 'CASH', transactionCount: 2, revenue: '90000.00' },
          { paymentMethod: 'QRIS', transactionCount: 1, revenue: '50000.00' },
        ],
        getCategorySales: async () => [
          {
            categoryId: 'cat-1',
            category: 'Minuman',
            quantitySold: 3,
            revenue: '140000.00',
          },
          {
            categoryId: null,
            category: 'Tanpa Kategori',
            quantitySold: 1,
            revenue: '10000.00',
          },
        ],
      }),
    })

    const result = await service.getBreakdown({
      start_date: '2026-11-01',
      end_date: '2026-11-03',
    })

    expect(result).toEqual({
      payment_methods: [
        { payment_method: 'CASH', transaction_count: 2, revenue: '90000.00' },
        { payment_method: 'QRIS', transaction_count: 1, revenue: '50000.00' },
      ],
      categories: [
        {
          category_id: 'cat-1',
          category: 'Minuman',
          quantity_sold: 3,
          revenue: '140000.00',
        },
        {
          category_id: null,
          category: 'Tanpa Kategori',
          quantity_sold: 1,
          revenue: '10000.00',
        },
      ],
    })
  })
})