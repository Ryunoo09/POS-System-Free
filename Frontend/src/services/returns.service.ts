import { http } from './api'
import type { ListResult } from '@/types/api'
import type { ReturnCreatePayload, ReturnListParams, ReturnRecord } from '@/types/return'

export const returnsService = {
  async list(params: ReturnListParams): Promise<ListResult<ReturnRecord>> {
    return http.getList<ReturnRecord>('/returns', { params })
  },

  async detail(id: string): Promise<ReturnRecord> {
    const response = await http.get<ReturnRecord>(`/returns/${id}`)
    return response.data
  },

  async create(payload: ReturnCreatePayload): Promise<ReturnRecord> {
    const response = await http.post<ReturnRecord>('/returns', payload)
    return response.data
  },
}