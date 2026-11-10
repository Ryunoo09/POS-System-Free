import type { DecimalString } from './api'

export type ActiveFilter = '' | 'true' | 'false'

export interface Product {
  id: string
  sku: string
  barcode: string | null
  name: string
  description: string | null
  category: { id: string; name: string }
  unit: string
  cost_price?: DecimalString
  selling_price: DecimalString
  stock: number
  min_stock: number
  is_low_stock: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProductFilterState {
  search: string
  category_id: string
  is_active: ActiveFilter
}

export interface ProductListParams {
  page: number
  limit: number
  search?: string
  barcode?: string
  category_id?: string
  is_active?: Exclude<ActiveFilter, ''>
}

export interface ProductFormValues {
  sku: string
  barcode: string
  name: string
  description: string
  category_id: string
  unit: string
  cost_price: number
  selling_price: number
  stock: number
  min_stock: number
}

export interface ProductCreatePayload {
  sku: string
  barcode?: string
  name: string
  description?: string
  category_id: string
  unit: string
  cost_price: number
  selling_price: number
  stock: number
  min_stock: number
}

export type ProductUpdatePayload = Partial<Omit<ProductCreatePayload, 'stock'>> & {
  is_active?: boolean
}

export interface BarcodeAssignment {
  id: string
  barcode: string
}