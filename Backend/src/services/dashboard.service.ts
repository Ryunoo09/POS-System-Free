import type { ReportRepository } from '../repositories/report.repository.js'
import { eachDateInRange, resolveDateRange, type DateRangeInput } from '../utils/date-range.js'

export interface DashboardSummaryDto {
  period: { start_date: string; end_date: string }
  revenue: string
  cogs: string
  gross_profit: string
  transaction_count: number
  total_products: number
  total_stock: number
  low_stock_count: number
}

export interface DailySalesDto {
  date: string
  revenue: string
  transaction_count: number
}

export interface TopProductDto {
  product_id: string
  sku: string
  name: string
  quantity_sold: number
  revenue: string
}

export interface DashboardService {
  getSummary: (input: DateRangeInput) => Promise<DashboardSummaryDto>
  getSales: (input: DateRangeInput) => Promise<DailySalesDto[]>
  getTopProducts: (input: DateRangeInput, limit: number) => Promise<TopProductDto[]>
}

export const createDashboardService = ({
  reportRepository,
}: {
  reportRepository: ReportRepository
}): DashboardService => ({
  getSummary: async (input) => {
    const range = resolveDateRange(input)
    const totals = await reportRepository.getSummary(range)

    return {
      period: { start_date: range.startDate, end_date: range.endDate },
      revenue: totals.revenue,
      cogs: totals.cogs,
      gross_profit: totals.grossProfit,
      transaction_count: totals.transactionCount,
      total_products: totals.totalProducts,
      total_stock: totals.totalStock,
      low_stock_count: totals.lowStockCount,
    }
  },

  getSales: async (input) => {
    const range = resolveDateRange(input)
    const rows = await reportRepository.getDailySales(range)
    const byDate = new Map(rows.map((row) => [row.date, row]))

    return eachDateInRange(range.startDate, range.endDate).map((date) => {
      const row = byDate.get(date)

      return {
        date,
        revenue: row?.revenue ?? '0.00',
        transaction_count: row?.transactionCount ?? 0,
      }
    })
  },

  getTopProducts: async (input, limit) => {
    const range = resolveDateRange(input)
    const rows = await reportRepository.getTopProducts(range, limit)

    return rows.map((row) => ({
      product_id: row.productId,
      sku: row.sku,
      name: row.name,
      quantity_sold: row.quantitySold,
      revenue: row.revenue,
    }))
  },
})