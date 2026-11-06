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