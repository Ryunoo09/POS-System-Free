import { http } from './api'
import type { ListResult } from '@/types/api'
import type {
  Product,
  ProductCreatePayload,
  ProductListParams,
  ProductUpdatePayload,
} from '@/types/product'

export const productsService = {
  async list(params: ProductListParams): Promise<ListResult<Product>> {
    return http.getList<Product>('/products', { params })
  },

  async create(payload: ProductCreatePayload): Promise<Product> {
    const response = await http.post<Product>('/products', payload)
    return response.data
  },

  async update(id: string, payload: ProductUpdatePayload): Promise<Product> {
    const response = await http.put<Product>(`/products/${id}`, payload)
    return response.data
  },

  async deactivate(id: string): Promise<Product> {
    const response = await http.delete<Product>(`/products/${id}`)
    return response.data
  },
}