import { http } from './api'
import type { ListResult } from '@/types/api'
import type { DateRange } from '@/types/dashboard'
import type {
  CheckoutPayload,
  TransactionCashierOption,
  TransactionDetail,
  TransactionListParams,
  TransactionSummary,
} from '@/types/transaction'

export const transactionsService = {
  async recent(range: DateRange, limit = 5): Promise<TransactionSummary[]> {
    const result = await http.getList<TransactionSummary>('/transactions', {
      params: { ...range, status: 'COMPLETED', limit },
    })
    return result.items
  },

  async list(params: TransactionListParams): Promise<ListResult<TransactionSummary>> {
    return http.getList<TransactionSummary>('/transactions', { params })
  },

  async detail(id: string): Promise<TransactionDetail> {
    const response = await http.get<TransactionDetail>(`/transactions/${id}`)
    return response.data
  },

  async cashiers(): Promise<TransactionCashierOption[]> {
    const response = await http.get<TransactionCashierOption[]>('/transactions/cashiers')
    return response.data
  },

  async checkout(payload: CheckoutPayload, idempotencyKey: string): Promise<TransactionDetail> {
    const response = await http.post<TransactionDetail>('/transactions', payload, {
      headers: { 'Idempotency-Key': idempotencyKey },
    })
    return response.data
  },
}
