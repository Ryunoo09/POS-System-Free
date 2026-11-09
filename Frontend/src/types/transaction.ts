export type TransactionStatus = 'COMPLETED' | 'CANCELLED'

export type PaymentMethod = 'CASH' | 'QRIS' | 'DEBIT_CARD' | 'BANK_TRANSFER'

export interface TransactionSummary {
  id: string
  invoice_number: string
  cashier: { id: string; name: string }
  status: TransactionStatus
  subtotal: string
  discount_amount: string
  tax_amount: string
  total_amount: string
  payment_method: PaymentMethod
  item_count: number
  created_at: string
}

export interface TransactionListParams {
  page: number
  limit: number
  start_date?: string
  end_date?: string
  cashier_id?: string
  status?: TransactionStatus
  payment_method?: PaymentMethod
  search?: string
}

export interface TransactionCashierOption {
  id: string
  name: string
}

export interface TransactionItem {
  id: string
  product_id: string
  product_name: string
  product_sku: string
  quantity: number
  unit_price: string
  unit_cost?: string
  discount_amount: string
  subtotal: string
}

export interface TransactionDetail {
  id: string
  invoice_number: string
  status: TransactionStatus
  cashier: { id: string; name: string }
  items: TransactionItem[]
  subtotal: string
  discount_amount: string
  tax_amount: string
  total_amount: string
  payment_method: PaymentMethod
  payment_reference: string | null
  amount_paid: string
  change_amount: string
  created_at: string
}

export interface CheckoutItemInput {
  product_id: string
  quantity: number
}

export interface CheckoutPaymentInput {
  method: PaymentMethod
  amount_paid: number
  reference?: string
}

export interface CheckoutPayload {
  items: CheckoutItemInput[]
  discount_amount: number
  payment: CheckoutPaymentInput
}
