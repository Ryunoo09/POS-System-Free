import type { PaginationMeta } from './api'
import type { DateRange } from './dashboard'

export type SalesGroupBy = 'daily' | 'weekly' | 'monthly'

export type ProductReportSort = 'best_selling' | 'revenue' | 'profit'

export interface ReportSummary {
  revenue: string
  cogs: string
  gross_profit: string
  transaction_count: number
}

export interface SalesReportRow {
  period: string
  period_label: string
  transaction_count: number
  revenue: string
  cogs: string
  gross_profit: string
}

export interface ProductReportRow {
  product_id: string
  sku: string
  name: string
  category: string | null
  quantity_sold: number
  revenue: string
  cogs: string
  gross_profit: string
}

export interface CashierReportRow {
  cashier_id: string
  cashier_name: string
  transaction_count: number
  revenue: string
  gross_profit: string
  average_transaction: string
}

export interface ReportPayload<TRow> {
  summary: ReportSummary
  rows: TRow[]
}

export interface ProductReportPayload extends ReportPayload<ProductReportRow> {
  meta: PaginationMeta
}

export interface SalesReportParams extends DateRange {
  group_by: SalesGroupBy
}

export interface ProductReportParams extends DateRange {
  category_id?: string | undefined
  sort: ProductReportSort
  page: number
  limit: number
}

export interface ReportsQuery {
  range: DateRange
  groupBy: SalesGroupBy
  sort: ProductReportSort
  categoryId: string
  page: number
  limit: number
}
