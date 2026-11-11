import { describe, expect, it } from 'vitest'
import type { ReportRepository } from '../../src/repositories/report.repository.js'
import { createReportService } from '../../src/services/report.service.js'

const range = { start_date: '2026-11-01', end_date: '2026-11-30' }

const buildRepository = (overrides: Partial<ReportRepository> = {}): ReportRepository => ({
  getSummary: async () => ({
    revenue: '140000.00',
    cogs: '80000.00',
    grossProfit: '60000.00',
    transactionCount: 2,
    totalProducts: 2,
    totalStock: 12,
    lowStockCount: 1,
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

const summary = {
  revenue: '140000.00',
  cogs: '80000.00',
  gross_profit: '60000.00',
  transaction_count: 2,
}

describe('ReportService.getSales', () => {
  it('memetakan baris penjualan harian dan label', async () => {
    const service = createReportService({
      reportRepository: buildRepository({
        getPeriodSales: async () => [
          {
            period: '2026-11-01',
            revenue: '90000.00',
            cogs: '60000.00',
            grossProfit: '30000.00',
            transactionCount: 1,
          },
        ],
      }),
    })

    const result = await service.getSales({ ...range, group_by: 'daily' })

    expect(result.summary).toEqual(summary)
    expect(result.rows).toEqual([
      {
        period: '2026-11-01',
        period_label: '1 Nov 2026',
        transaction_count: 1,
        revenue: '90000.00',
        cogs: '60000.00',
        gross_profit: '30000.00',
      },
    ])
  })

  it('membuat label mingguan dan bulanan', async () => {
    const service = createReportService({
      reportRepository: buildRepository({
        getPeriodSales: async () => [
          {
            period: '2026-11-02',
            revenue: '10.00',
            cogs: '5.00',
            grossProfit: '5.00',
            transactionCount: 1,
          },
        ],
      }),
    })

    const weekly = await service.getSales({ ...range, group_by: 'weekly' })
    const monthly = await service.getSales({ ...range, group_by: 'monthly' })

    expect(weekly.rows[0]?.period_label).toBe('2 Nov 2026 – 8 Nov 2026')
    expect(monthly.rows[0]?.period_label).toBe('November 2026')
  })
})

describe('ReportService.getProducts', () => {
  it('memetakan produk dan meta pagination', async () => {
    const service = createReportService({
      reportRepository: buildRepository({
        listProductSales: async () => ({
          items: [
            {
              productId: 'product-a',
              sku: 'DASH-A',
              name: 'Produk A',
              category: 'Minuman',
              quantitySold: 2,
              revenue: '100000.00',
              cogs: '60000.00',
              grossProfit: '40000.00',
            },
          ],
          total: 3,
        }),
      }),
    })

    const result = await service.getProducts({
      start_date: '2026-11-01',
      end_date: '2026-11-30',
      sort: 'best_selling',
      page: 2,
      limit: 1,
    })

    expect(result.summary).toEqual(summary)
    expect(result.meta).toEqual({ page: 2, limit: 1, total_items: 3, total_pages: 3 })
    expect(result.rows[0]).toEqual({
      product_id: 'product-a',
      sku: 'DASH-A',
      name: 'Produk A',
      category: 'Minuman',
      quantity_sold: 2,
      revenue: '100000.00',
      cogs: '60000.00',
      gross_profit: '40000.00',
    })
  })
})

describe('ReportService.getInventoryValuation', () => {
  it('memetakan total, item, dan agregasi kategori', async () => {
    const service = createReportService({
      reportRepository: buildRepository({
        getInventoryValuation: async () => ({
          totalValue: '500000.00',
          totalQuantity: 100,
          items: [
            {
              productId: 'product-a',
              sku: 'SKU-1',
              name: 'Produk A',
              category: 'Makanan',
              stock: 100,
              averageCost: '5000.00',
              inventoryValue: '500000.00',
            },
          ],
          byCategory: [
            { categoryId: 'cat-1', category: 'Makanan', quantity: 100, value: '500000.00' },
          ],
        }),
      }),
    })

    const result = await service.getInventoryValuation({})

    expect(result.total_value).toBe('500000.00')
    expect(result.total_quantity).toBe(100)
    expect(result.items[0]).toEqual({
      product_id: 'product-a',
      sku: 'SKU-1',
      name: 'Produk A',
      category: 'Makanan',
      stock: 100,
      average_cost: '5000.00',
      inventory_value: '500000.00',
    })
    expect(result.by_category).toEqual([
      { category_id: 'cat-1', category: 'Makanan', quantity: 100, value: '500000.00' },
    ])
  })
})

describe('ReportService.getCashiers', () => {
  it('memetakan performa kasir', async () => {
    const service = createReportService({
      reportRepository: buildRepository({
        listCashierSales: async () => [
          {
            cashierId: 'cashier-1',
            cashierName: 'Kasir Satu',
            transactionCount: 2,
            revenue: '140000.00',
            grossProfit: '60000.00',
            averageTransaction: '70000.00',
          },
        ],
      }),
    })

    const result = await service.getCashiers(range)

    expect(result.rows).toEqual([
      {
        cashier_id: 'cashier-1',
        cashier_name: 'Kasir Satu',
        transaction_count: 2,
        revenue: '140000.00',
        gross_profit: '60000.00',
        average_transaction: '70000.00',
      },
    ])
  })
})
