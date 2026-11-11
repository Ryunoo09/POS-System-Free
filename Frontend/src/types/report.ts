import type { PaginationMeta } from './api'
import type { DateRange } from './dashboard'

export type SalesGroupBy = 'daily' | 'weekly' | 'monthly'

export type ProductReportSort = 'best_selling' | 'revenue' | 'profit'

export interface ReportSummary {
  revenue: string
  cogs: string
  gross_profit: string
  gross_margin_pct: string
  transaction_count: number
}

export interface SalesReportRow {
  period: string
  period_label: string
  transaction_count: number
  revenue: string
  cogs: string
  gross_profit: string
  gross_margin_pct: string
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
  gross_margin_pct: string
}

export interface CashierReportRow {
  cashier_id: string
  cashier_name: string
  transaction_count: number
  revenue: string
  gross_profit: string
  average_transaction: string
}

export interface ValuationItemRow {
  product_id: string
  sku: string
  name: string
  category: string
  stock: number
  average_cost: string
  inventory_value: string
}

export interface ValuationCategoryRow {
  category_id: string | null
  category: string
  quantity: number
  value: string
}

export interface InventoryValuationPayload {
  total_value: string
  total_quantity: number
  items: ValuationItemRow[]
  by_category: ValuationCategoryRow[]
}

export interface ValuationParams {
  category_id?: string | undefined
}

export interface CategoryCogsRow {
  category_id: string | null
  category: string
  quantity_sold: number
  revenue: string
  cogs: string
  gross_profit: string
  gross_margin_pct: string
}

export interface CogsReportPayload {
  summary: ReportSummary
  rows: CategoryCogsRow[]
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
