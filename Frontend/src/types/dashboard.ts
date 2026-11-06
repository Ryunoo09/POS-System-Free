import type { PaymentMethod } from './transaction'

export interface DateRange {
  start_date: string
  end_date: string
}

export type DateRangePreset = 'today' | 'last7' | 'last30' | 'thisMonth' | 'custom'

export interface DashboardPeriod {
  start_date: string
  end_date: string
}

export interface DashboardSummaryPrevious {
  period: DashboardPeriod
  revenue: string
  cogs: string
  gross_profit: string
  transaction_count: number
}

export interface DashboardSummary {
  period: DashboardPeriod
  revenue: string
  cogs: string
  gross_profit: string
  transaction_count: number
  total_products: number
  total_stock: number
  low_stock_count: number
  previous: DashboardSummaryPrevious
}

export interface DailySales {
  date: string
  revenue: string
  transaction_count: number
}

export interface TopProduct {
  product_id: string
  sku: string
  name: string
  quantity_sold: number
  revenue: string
}

export interface PaymentMethodSales {
  payment_method: PaymentMethod
  transaction_count: number
  revenue: string
}

export interface CategorySales {
  category_id: string | null
  category: string
  quantity_sold: number
  revenue: string
}

export interface DashboardBreakdown {
  payment_methods: PaymentMethodSales[]
  categories: CategorySales[]
}