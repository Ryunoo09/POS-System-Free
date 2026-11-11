import { http } from './api'
import type { ListResult } from '@/types/api'
import type {
  StockOpnameCreatePayload,
  StockOpnameDetail,
  StockOpnameItem,
  StockOpnameListItem,
  StockOpnameListParams,
  StockOpnameUpdateItemPayload,
} from '@/types/stock-opname'

export const stockOpnamesService = {
  async list(params: StockOpnameListParams): Promise<ListResult<StockOpnameListItem>> {
    return http.getList<StockOpnameListItem>('/stock-opnames', { params })
  },

  async get(id: string): Promise<StockOpnameDetail> {
    const response = await http.get<StockOpnameDetail>(`/stock-opnames/${id}`)
    return response.data
  },

  async create(payload: StockOpnameCreatePayload): Promise<StockOpnameDetail> {
    const response = await http.post<StockOpnameDetail>('/stock-opnames', payload)
    return response.data
  },

  async start(id: string): Promise<StockOpnameDetail> {
    const response = await http.post<StockOpnameDetail>(`/stock-opnames/${id}/start`)
    return response.data
  },

  async updateItem(
    id: string,
    itemId: string,
    payload: StockOpnameUpdateItemPayload,
  ): Promise<StockOpnameItem> {
    const response = await http.patch<StockOpnameItem>(`/stock-opnames/${id}/items/${itemId}`, payload)
    return response.data
  },

  async submit(id: string): Promise<StockOpnameDetail> {
    const response = await http.post<StockOpnameDetail>(`/stock-opnames/${id}/submit`)
    return response.data
  },

  async approve(id: string): Promise<StockOpnameDetail> {
    const response = await http.post<StockOpnameDetail>(`/stock-opnames/${id}/approve`)
    return response.data
  },

  async reject(id: string, reason: string): Promise<StockOpnameDetail> {
    const response = await http.post<StockOpnameDetail>(`/stock-opnames/${id}/reject`, { reason })
    return response.data
  },

  async complete(id: string): Promise<StockOpnameDetail> {
    const response = await http.post<StockOpnameDetail>(`/stock-opnames/${id}/complete`)
    return response.data
  },

  async cancel(id: string): Promise<StockOpnameDetail> {
    const response = await http.post<StockOpnameDetail>(`/stock-opnames/${id}/cancel`)
    return response.data
  },
}