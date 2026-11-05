import type { ActiveFilter } from './product'

export interface Category {
  id: string
  name: string
  description: string | null
  is_active: boolean
  product_count: number
  created_at: string
  updated_at: string
}

export interface CategoryFilterState {
  search: string
  is_active: ActiveFilter
}

export interface CategoryListParams {
  page: number
  limit: number
  search?: string
  is_active?: Exclude<ActiveFilter, ''>
}

export interface CategoryFormValues {
  name: string
  description: string
}

export interface CategoryCreatePayload {
  name: string
  description?: string
}

export interface CategoryUpdatePayload {
  name?: string
  description?: string
  is_active?: boolean
}