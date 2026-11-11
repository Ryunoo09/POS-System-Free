export const STOCK_OPNAME_STATUSES = {
  DRAFT: 'DRAFT',
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const

export type StockOpnameStatus =
  (typeof STOCK_OPNAME_STATUSES)[keyof typeof STOCK_OPNAME_STATUSES]

export const STOCK_OPNAME_SCOPES = {
  ALL: 'ALL',
  CATEGORY: 'CATEGORY',
  PRODUCT: 'PRODUCT',
} as const

export type StockOpnameScope =
  (typeof STOCK_OPNAME_SCOPES)[keyof typeof STOCK_OPNAME_SCOPES]

/** Batas jumlah produk per sesi opname (PRD §8.4). */
export const MAX_OPNAME_ITEMS = 5000
