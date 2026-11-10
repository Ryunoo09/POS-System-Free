export type PurchaseOrderStatus = 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED'

export interface PurchaseOrderItem {
  id: string
  product_id: string
  product_name: string
  product_sku: string
  quantity: number
  cost_price: string
  subtotal: string
}

export interface PurchaseOrder {
  id: string
  po_number: string
  status: PurchaseOrderStatus
  total_amount: string
  notes: string | null
  supplier: { id: string; name: string }
  created_by: { id: string; name: string }
  items: PurchaseOrderItem[]
  ordered_at: string | null
  received_at: string | null
  created_at: string
  updated_at: string
}

export interface PurchaseOrderFilterState {
  search: string
  status: '' | PurchaseOrderStatus
  supplier_id: string
}

export interface PurchaseOrderListParams {
  page: number
  limit: number
  search?: string
  status?: PurchaseOrderStatus
  supplier_id?: string
}

export interface PurchaseOrderItemInput {
  product_id: string
  quantity: number
  cost_price: number
}

export interface PurchaseOrderCreatePayload {
  supplier_id: string
  notes?: string
  items: PurchaseOrderItemInput[]
}

export interface PurchaseOrderFormItem {
  product_id: string
  quantity: number
  cost_price: number
}

export interface PurchaseOrderFormValues {
  supplier_id: string
  notes: string
  items: PurchaseOrderFormItem[]
}