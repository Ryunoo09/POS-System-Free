export type PriceField = 'SELLING_PRICE' | 'COST_PRICE'
export type PriceSource = 'MANUAL' | 'SCHEDULED' | 'BULK'
export type ScheduledPriceStatus = 'SCHEDULED' | 'APPLIED' | 'CANCELLED'
export type BulkPriceMode = 'SET' | 'PERCENT' | 'NOMINAL'

export interface PriceHistoryEntry {
  id: string
  field: PriceField
  old_value: string
  new_value: string
  source: PriceSource
  reason: string | null
  changed_by: { id: string; name: string } | null
  created_at: string
}

export interface ScheduledPrice {
  id: string
  selling_price: string
  effective_date: string
  status: ScheduledPriceStatus
  reason: string
  applied_at: string | null
  created_at: string
}

export interface SchedulePricePayload {
  selling_price: number
  effective_date: string
  reason: string
}

export interface BulkPricePayload {
  mode: BulkPriceMode
  value: number
  product_ids?: string[]
  category_id?: string
}

export interface BulkPriceApplyPayload extends BulkPricePayload {
  reason: string
}

export interface BulkPriceItem {
  id: string
  name: string
  sku: string
  old_price: string
  new_price: string
}
