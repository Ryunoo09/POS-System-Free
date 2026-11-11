import { http } from './api'
import type { DateRange } from '@/types/dashboard'
import type {
  CashierReportRow,
  InventoryValuationPayload,
  ProductReportParams,
  ProductReportPayload,
  ProductReportRow,
  ReportPayload,
  SalesReportParams,
  SalesReportRow,
  ValuationParams,
} from '@/types/report'

export const reportsService = {
  async getSales(params: SalesReportParams): Promise<ReportPayload<SalesReportRow>> {
    const response = await http.get<ReportPayload<SalesReportRow>>('/reports/sales', { params })
    return response.data
  },

  async getProducts(params: ProductReportParams): Promise<ProductReportPayload> {
    const response = await http.get<ReportPayload<ProductReportRow>>('/reports/products', { params })
    const fallbackMeta = {
      page: params.page,
      limit: params.limit,
      total_items: response.data.rows.length,
      total_pages: response.data.rows.length > 0 ? 1 : 0,
    }

    return { ...response.data, meta: response.meta ?? fallbackMeta }
  },

  async getCashiers(params: DateRange): Promise<ReportPayload<CashierReportRow>> {
    const response = await http.get<ReportPayload<CashierReportRow>>('/reports/cashiers', {
      params,
    })
    return response.data
  },

  async getInventoryValuation(params: ValuationParams): Promise<InventoryValuationPayload> {
    const response = await http.get<InventoryValuationPayload>('/reports/inventory-valuation', {
      params,
    })
    return response.data
  },
}
