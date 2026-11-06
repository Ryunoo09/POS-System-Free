import { http } from './api'
import type {
  DailySales,
  DashboardBreakdown,
  DashboardSummary,
  DateRange,
  TopProduct,
} from '@/types/dashboard'

export const dashboardService = {
  async getSummary(range: DateRange): Promise<DashboardSummary> {
    const response = await http.get<DashboardSummary>('/dashboard/summary', { params: range })
    return response.data
  },

  async getSales(range: DateRange): Promise<DailySales[]> {
    const response = await http.get<DailySales[]>('/dashboard/sales', { params: range })
    return response.data
  },

  async getTopProducts(range: DateRange, limit = 5): Promise<TopProduct[]> {
    const response = await http.get<TopProduct[]>('/dashboard/top-products', {
      params: { ...range, limit },
    })
    return response.data
  },

  async getBreakdown(range: DateRange): Promise<DashboardBreakdown> {
    const response = await http.get<DashboardBreakdown>('/dashboard/breakdown', {
      params: range,
    })
    return response.data
  },
}