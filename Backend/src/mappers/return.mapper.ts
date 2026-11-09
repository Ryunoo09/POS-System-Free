import type { ReturnAction, ReturnStatus } from '../constants/returns.js'
import type { PaymentMethod } from '../constants/transactions.js'
import type { ReturnView } from '../repositories/return.repository.js'

export interface ReturnItemDto {
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

export interface ReturnDto {
  id: string
  return_number: string
  status: ReturnStatus
  reason: string
  refund_amount: string
  refund_method: PaymentMethod
  cashier: { id: string; name: string }
  transaction: { id: string; invoice_number: string }
  items: ReturnItemDto[]
  created_at: string
}

export const toReturnDto = (view: ReturnView): ReturnDto => ({
  id: view.id,
  return_number: view.returnNumber,
  status: view.status,
  reason: view.reason,
  refund_amount: view.refundAmount.toFixed(2),
  refund_method: view.refundMethod,
  cashier: { id: view.cashier.id, name: view.cashier.name },
  transaction: { id: view.transaction.id, invoice_number: view.transaction.invoiceNumber },
  items: view.items.map((item) => ({
    id: item.id,
    transaction_item_id: item.transactionItemId,
    product_id: item.productId,
    product_name: item.product.name,
    product_sku: item.product.sku,
    quantity: item.quantity,
    unit_price: item.unitPrice.toFixed(2),
    subtotal: item.subtotal.toFixed(2),
    action: item.action,
  })),
  created_at: view.createdAt.toISOString(),
})