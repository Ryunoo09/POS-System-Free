export const TOKEN_STORAGE_KEY = 'pos.access_token'

export const DEFAULT_PAGE_SIZE = 10
export const MAX_PAGE_SIZE = 100

export const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Tunai' },
  { value: 'QRIS', label: 'QRIS' },
  { value: 'DEBIT_CARD', label: 'Kartu Debit' },
  { value: 'BANK_TRANSFER', label: 'Transfer Bank' },
] as const
