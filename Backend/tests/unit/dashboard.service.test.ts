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
      transaction_count: 2,
      total_products: 2,
      total_stock: 12,
      low_stock_count: 1,
    })
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