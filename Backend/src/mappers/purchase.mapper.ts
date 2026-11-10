import type { PurchaseOrderStatus } from '../constants/purchasing.js'
import type { PurchaseOrderView } from '../repositories/purchase.repository.js'

export interface PurchaseOrderItemDto {
  id: string
  product_id: string
  product_name: string
  product_sku: string
  quantity: number
  cost_price: string
  subtotal: string
}

export interface PurchaseOrderDto {
  id: string
  po_number: string
  status: PurchaseOrderStatus
  total_amount: string
  notes: string | null
  supplier: { id: string; name: string }
  created_by: { id: string; name: string }
  items: PurchaseOrderItemDto[]
  ordered_at: string | null
  received_at: string | null
  created_at: string
  updated_at: string
}

export const toPurchaseOrderDto = (view: PurchaseOrderView): PurchaseOrderDto => ({
  id: view.id,
  po_number: view.poNumber,
  status: view.status,
  total_amount: view.totalAmount.toFixed(2),
  notes: view.notes,
  supplier: { id: view.supplier.id, name: view.supplier.name },
  created_by: { id: view.createdBy.id, name: view.createdBy.name },
  items: view.items.map((item) => ({
    id: item.id,
    product_id: item.productId,
    product_name: item.productName,
    product_sku: item.product.sku,
    quantity: item.quantity,
    cost_price: item.costPrice.toFixed(2),
    subtotal: item.subtotal.toFixed(2),
  })),
  ordered_at: view.orderedAt?.toISOString() ?? null,
  received_at: view.receivedAt?.toISOString() ?? null,
  created_at: view.createdAt.toISOString(),
  updated_at: view.updatedAt.toISOString(),
})