import { http } from './api'
import type { ListResult } from '@/types/api'
import type {
  Supplier,
  SupplierCreatePayload,
  SupplierListParams,
  SupplierUpdatePayload,
} from '@/types/supplier'

export const suppliersService = {
  async list(params: SupplierListParams): Promise<ListResult<Supplier>> {
    return http.getList<Supplier>('/suppliers', { params })
  },

  async create(payload: SupplierCreatePayload): Promise<Supplier> {
    const response = await http.post<Supplier>('/suppliers', payload)
    return response.data
  },

  async update(id: string, payload: SupplierUpdatePayload): Promise<Supplier> {
    const response = await http.put<Supplier>(`/suppliers/${id}`, payload)
    return response.data
  },

  async remove(id: string): Promise<Supplier> {
    const response = await http.delete<Supplier>(`/suppliers/${id}`)
    return response.data
  },
}