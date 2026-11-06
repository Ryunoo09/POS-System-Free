import { http } from './api'
import type { DateRange } from '@/types/dashboard'
import type {
  CheckoutPayload,
  TransactionDetail,
  TransactionSummary,
} from '@/types/transaction'

export const transactionsService = {
  async recent(range: DateRange, limit = 5): Promise<TransactionSummary[]> {
    const result = await http.getList<TransactionSummary>('/transactions', {
      params: { ...range, status: 'COMPLETED', limit },
    })
    return result.items
  },

  async checkout(payload: CheckoutPayload, idempotencyKey: string): Promise<TransactionDetail> {
    const response = await http.post<TransactionDetail>('/transactions', payload, {
      headers: { 'Idempotency-Key': idempotencyKey },
    })
    return response.data
  },
}
