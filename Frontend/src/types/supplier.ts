export type SupplierActiveFilter = '' | 'true' | 'false'

export interface Supplier {
  id: string
  name: string
  contact: string | null
  phone: string | null
  email: string | null
  address: string | null
  is_active: boolean
  purchase_order_count: number
  created_at: string
  updated_at: string
}

export interface SupplierFilterState {
  search: string
  is_active: SupplierActiveFilter
}

export interface SupplierListParams {
  page: number
  limit: number
  search?: string
  is_active?: Exclude<SupplierActiveFilter, ''>
}

export interface SupplierFormValues {
  name: string
  contact: string
  phone: string
  email: string
  address: string
}

export interface SupplierCreatePayload {
  name: string
  contact?: string
  phone?: string
  email?: string
  address?: string
}

export interface SupplierUpdatePayload {
  name?: string
  contact?: string
  phone?: string
  email?: string
  address?: string
  is_active?: boolean
}