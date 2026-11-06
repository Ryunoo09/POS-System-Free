import type { DecimalString } from './api'
import type { Product } from './product'

export interface InventoryProduct extends Product {
  stock_value: DecimalString
}

export type StockMovementType =
  | 'INITIAL_STOCK'
  | 'PURCHASE'
  | 'SALE'
  | 'ADJUSTMENT'
  | 'RETURN'

export type StockReferenceType = 'PRODUCT' | 'TRANSACTION' | 'MANUAL'

export interface StockMovement {
  id: string
  product: { id: string; sku: string; name: string }
  movement_type: StockMovementType
  quantity: number
  stock_before: number
  stock_after: number
  reference_type: StockReferenceType
  reference_id: string | null
  invoice_number: string | null
  notes: string | null
  created_by: { id: string; name: string }
  created_at: string
}

export interface InventoryListParams {
  page: number
  limit: number
  search?: string
  category_id?: string
}

export interface LowStockParams {
  page: number
  limit: number
}

export interface MovementListParams {
  page: number
  limit: number
  product_id?: string
  movement_type?: StockMovementType
  start_date?: string
  end_date?: string
}

export type AdjustMovementType = 'PURCHASE' | 'ADJUSTMENT'

export interface AdjustStockPayload {
  product_id: string
  movement_type: AdjustMovementType
  quantity: number
  notes?: string
}

export interface AdjustStockResult {
  movement: StockMovement
  product: { id: string; sku: string; stock: number }
}