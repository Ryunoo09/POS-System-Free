export const TRANSACTION_STATUSES = {
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const

export type TransactionStatus =
  (typeof TRANSACTION_STATUSES)[keyof typeof TRANSACTION_STATUSES]

export const PAYMENT_METHODS = {
  CASH: 'CASH',
  QRIS: 'QRIS',
  DEBIT_CARD: 'DEBIT_CARD',
  BANK_TRANSFER: 'BANK_TRANSFER',
} as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS]