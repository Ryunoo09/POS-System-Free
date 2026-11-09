import type { PaymentMethod, TransactionStatus } from '../constants/transactions.js'
import type {
  TransactionDetailView,
  TransactionView,
} from '../repositories/transaction.repository.js'

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

export interface TransactionItemDto {
  product_id: string
  product_name: string
  product_sku: string
  quantity: number
  unit_price: string
  unit_cost?: string
  discount_amount: string
  subtotal: string
}

export interface TransactionDetailDto {
  id: string
  invoice_number: string
  status: TransactionStatus
  cashier: { id: string; name: string }
  items: TransactionItemDto[]
  subtotal: string
  discount_amount: string
  tax_amount: string
  total_amount: string
  payment_method: PaymentMethod
  payment_reference: string | null
  amount_paid: string
  change_amount: string
  shift_id: string | null
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

export interface TransactionDetailMapperOptions {
  canViewCostPrice: boolean
}

/** `unit_cost` hanya dibuka untuk role dengan `cost-price:read` (FR-TRANS-003). */
export const toTransactionDetailDto = (
  transaction: TransactionDetailView,
  options: TransactionDetailMapperOptions,
): TransactionDetailDto => ({
  id: transaction.id,
  invoice_number: transaction.invoiceNumber,
  status: transaction.status,
  cashier: { id: transaction.cashier.id, name: transaction.cashier.name },
  items: transaction.items.map((item) => {
    const dto: TransactionItemDto = {
      product_id: item.productId,
      product_name: item.productNameSnapshot,
      product_sku: item.productSkuSnapshot,
      quantity: item.quantity,
      unit_price: item.unitPrice.toFixed(2),
      discount_amount: item.discountAmount.toFixed(2),
      subtotal: item.subtotal.toFixed(2),
    }

    if (options.canViewCostPrice) {
      dto.unit_cost = item.unitCost.toFixed(2)
    }

    return dto
  }),
  subtotal: transaction.subtotal.toFixed(2),
  discount_amount: transaction.discountAmount.toFixed(2),
  tax_amount: transaction.taxAmount.toFixed(2),
  total_amount: transaction.totalAmount.toFixed(2),
  payment_method: transaction.paymentMethod,
  payment_reference: transaction.paymentReference,
  amount_paid: transaction.amountPaid.toFixed(2),
  change_amount: transaction.changeAmount.toFixed(2),
  shift_id: transaction.shiftId,
  created_at: transaction.createdAt.toISOString(),
})
