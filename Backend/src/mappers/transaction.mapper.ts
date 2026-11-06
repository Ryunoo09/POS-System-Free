import type { PaymentMethod, TransactionStatus } from '../constants/transactions.js'
import type { TransactionView } from '../repositories/transaction.repository.js'

export interface TransactionDto {
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

export const toTransactionDto = (transaction: TransactionView): TransactionDto => ({
  id: transaction.id,
  invoice_number: transaction.invoiceNumber,
  cashier: { id: transaction.cashier.id, name: transaction.cashier.name },
  status: transaction.status,
  subtotal: transaction.subtotal.toFixed(2),
  discount_amount: transaction.discountAmount.toFixed(2),
  tax_amount: transaction.taxAmount.toFixed(2),
  total_amount: transaction.totalAmount.toFixed(2),
  payment_method: transaction.paymentMethod,
  item_count: transaction._count.items,
  created_at: transaction.createdAt.toISOString(),
})