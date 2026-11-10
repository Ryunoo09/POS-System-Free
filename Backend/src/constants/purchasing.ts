export const PURCHASE_ORDER_STATUSES = {
  DRAFT: 'DRAFT',
  ORDERED: 'ORDERED',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED',
} as const

export type PurchaseOrderStatus =
  (typeof PURCHASE_ORDER_STATUSES)[keyof typeof PURCHASE_ORDER_STATUSES]
