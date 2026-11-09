import type { PaymentMethod } from './transaction'

export type ReturnStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED'

export type ReturnAction = 'RESTOCK' | 'DAMAGED'

export interface ReturnItem {
  id: string
  transaction_item_id: string
  product_id: string
  product_name: string
  product_sku: string
  quantity: number
  unit_price: string
  subtotal: string
  action: ReturnAction
}

export interface ReturnRecord {
  id: string
  return_number: string
  status: ReturnStatus
  reason: string
  refund_amount: string
  refund_method: PaymentMethod
  cashier: { id: string; name: string }
  transaction: { id: string; invoice_number: string }
  items: ReturnItem[]
  created_at: string
}

export interface ReturnCreateItemPayload {
  transaction_item_id: string
  quantity: number
  action: ReturnAction
}

export interface ReturnCreatePayload {
  transaction_id: string
  reason: string
  refund_method: PaymentMethod
  items: ReturnCreateItemPayload[]
}

export interface ReturnListParams {
  page: number
  limit: number
  transaction_id?: string
  cashier_id?: string
  status?: ReturnStatus
  start_date?: string
  end_date?: string
}