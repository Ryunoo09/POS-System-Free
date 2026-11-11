export type StockOpnameStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'

export type StockOpnameScope = 'ALL' | 'CATEGORY' | 'PRODUCT'

export interface StockOpnameItem {
  id: string
  product_id: string
  sku: string
  barcode: string | null
  name: string
  system_stock: number
  physical_stock: number | null
  difference: number | null
  reason: string | null
  counted_by: { id: string; name: string } | null
  counted_at: string | null
}

export interface StockOpnameSummary {
  total_items: number
  counted_items: number
  uncounted_items: number
  positive_differences: number
  negative_differences: number
  zero_differences: number
  total_adjustment_quantity: number
}

export interface StockOpnameSession {
  id: string
  session_number: string
  name: string
  status: StockOpnameStatus
  scope: StockOpnameScope
  notes: string | null
  rejection_reason: string | null
  created_by: { id: string; name: string }
  approved_by: { id: string; name: string } | null
  submitted_at: string | null
  approved_at: string | null
  rejected_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface StockOpnameListItem extends StockOpnameSession {
  total_items: number
  counted_items: number
}

export interface StockOpnameDetail extends StockOpnameSession, StockOpnameSummary {
  items: StockOpnameItem[]
}

export interface StockOpnameListParams {
  page: number
  limit: number
  status?: StockOpnameStatus
  scope?: StockOpnameScope
  start_date?: string
  end_date?: string
}

export interface StockOpnameCreatePayload {
  name: string
  scope: StockOpnameScope
  category_ids?: string[]
  product_ids?: string[]
  notes?: string
}

export interface StockOpnameUpdateItemPayload {
  physical_stock: number
  reason?: string
}