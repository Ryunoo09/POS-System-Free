import { http } from './api'
import type { ListResult } from '@/types/api'
import type {
  PurchaseOrder,
  PurchaseOrderCreatePayload,
  PurchaseOrderListParams,
} from '@/types/purchase'

export const purchasesService = {
  async list(params: PurchaseOrderListParams): Promise<ListResult<PurchaseOrder>> {
    return http.getList<PurchaseOrder>('/purchase-orders', { params })
  },

  async detail(id: string): Promise<PurchaseOrder> {
    const response = await http.get<PurchaseOrder>(`/purchase-orders/${id}`)
    return response.data
  },

  async create(payload: PurchaseOrderCreatePayload): Promise<PurchaseOrder> {
    const response = await http.post<PurchaseOrder>('/purchase-orders', payload)
    return response.data
  },

  async order(id: string): Promise<PurchaseOrder> {
    const response = await http.post<PurchaseOrder>(`/purchase-orders/${id}/order`)
    return response.data
  },

  async receive(id: string): Promise<PurchaseOrder> {
    const response = await http.post<PurchaseOrder>(`/purchase-orders/${id}/receive`)
    return response.data
  },

  async cancel(id: string): Promise<PurchaseOrder> {
    const response = await http.post<PurchaseOrder>(`/purchase-orders/${id}/cancel`)
    return response.data
  },
}