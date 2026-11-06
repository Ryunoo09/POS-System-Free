import { http } from './api'
import type { Product } from '@/types/product'

export const inventoryService = {
  async listLowStock(limit = 10): Promise<Product[]> {
    const result = await http.getList<Product>('/inventory/low-stock', { params: { limit } })
    return result.items
  },
}