import type { ReportRepository } from '../repositories/report.repository.js'
import {
  eachDateInRange,
  previousDateRange,
  resolveDateRange,
  type DateRangeInput,
} from '../utils/date-range.js'

export interface DashboardSummaryPreviousDto {
  period: { start_date: string; end_date: string }
  revenue: string
  cogs: string
  gross_profit: string
  transaction_count: number
}

export interface DashboardSummaryDto {
  period: { start_date: string; end_date: string }
  revenue: string
  cogs: string
  gross_profit: string
  transaction_count: number
  total_products: number
  total_stock: number
  low_stock_count: number
  previous: DashboardSummaryPreviousDto
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

export interface PaymentMethodSalesDto {
  payment_method: string
  transaction_count: number
  revenue: string
}

export interface CategorySalesDto {
  category_id: string | null
  category: string
  quantity_sold: number
  revenue: string
}

export interface DashboardBreakdownDto {
  payment_methods: PaymentMethodSalesDto[]
  categories: CategorySalesDto[]
}

export interface DashboardService {
  getSummary: (input: DateRangeInput) => Promise<DashboardSummaryDto>
  getSales: (input: DateRangeInput) => Promise<DailySalesDto[]>
  getTopProducts: (input: DateRangeInput, limit: number) => Promise<TopProductDto[]>
  getBreakdown: (input: DateRangeInput) => Promise<DashboardBreakdownDto>
}

export const createDashboardService = ({
  reportRepository,
}: {
  reportRepository: ReportRepository
}): DashboardService => ({
  getSummary: async (input) => {
    const range = resolveDateRange(input)
    const previousRange = previousDateRange(range)

    const [totals, previousTotals] = await Promise.all([
      reportRepository.getSummary(range),
      reportRepository.getSummary(previousRange),
    ])

    return {
      period: { start_date: range.startDate, end_date: range.endDate },
      revenue: totals.revenue,
      cogs: totals.cogs,
      gross_profit: totals.grossProfit,
      transaction_count: totals.transactionCount,
      total_products: totals.totalProducts,
      total_stock: totals.totalStock,
      low_stock_count: totals.lowStockCount,
      previous: {
        period: { start_date: previousRange.startDate, end_date: previousRange.endDate },
        revenue: previousTotals.revenue,
        cogs: previousTotals.cogs,
        gross_profit: previousTotals.grossProfit,
        transaction_count: previousTotals.transactionCount,
      },
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

  getBreakdown: async (input) => {
    const range = resolveDateRange(input)

    const [paymentMethods, categories] = await Promise.all([
      reportRepository.getPaymentMethodSales(range),
      reportRepository.getCategorySales(range),
    ])

    return {
      payment_methods: paymentMethods.map((row) => ({
        payment_method: row.paymentMethod,
        transaction_count: row.transactionCount,
        revenue: row.revenue,
      })),
      categories: categories.map((row) => ({
        category_id: row.categoryId,
        category: row.category,
        quantity_sold: row.quantitySold,
        revenue: row.revenue,
      })),
    }
  },
})