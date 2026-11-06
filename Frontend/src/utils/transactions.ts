import type { PaymentMethod, TransactionStatus } from '@/types/transaction'
import { PAYMENT_METHODS } from './constants'

type BadgeTone = 'success' | 'danger' | 'warning' | 'neutral'

export const paymentMethodLabel = (method: PaymentMethod): string =>
  PAYMENT_METHODS.find((item) => item.value === method)?.label ?? method

export const transactionStatusLabel = (status: TransactionStatus): string =>
  status === 'COMPLETED' ? 'Selesai' : 'Dibatalkan'

export const transactionStatusTone = (status: TransactionStatus): BadgeTone =>
  status === 'COMPLETED' ? 'success' : 'neutral'
