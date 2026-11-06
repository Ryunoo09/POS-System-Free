import { http } from './api'
import type { ListResult } from '@/types/api'
import type {
  AdjustStockPayload,
  AdjustStockResult,
  InventoryListParams,
  InventoryProduct,
  LowStockParams,
  MovementListParams,
  StockMovement,
} from '@/types/inventory'
import type { Product } from '@/types/product'

export const inventoryService = {
  async list(params: InventoryListParams): Promise<ListResult<InventoryProduct>> {
    return http.getList<InventoryProduct>('/inventory', { params })
  },

  async listLowStock(params: LowStockParams): Promise<ListResult<Product>> {
    return http.getList<Product>('/inventory/low-stock', { params })
  },

  async listMovements(params: MovementListParams): Promise<ListResult<StockMovement>> {
    return http.getList<StockMovement>('/inventory/movements', { params })
  },

  async adjust(payload: AdjustStockPayload): Promise<AdjustStockResult> {
    const response = await http.post<AdjustStockResult>('/inventory/adjustments', payload)
    return response.data
  },
}