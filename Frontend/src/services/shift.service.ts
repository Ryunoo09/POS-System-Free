import { api } from './api'
import type { ApiEnvelope, PaginationMeta } from '@/types/api'
import type {
  CashMovementPayload,
  CloseShiftPayload,
  OpenShiftPayload,
  Shift,
  ShiftHistoryParams,
  ShiftSummary,
} from '@/types/shift'

export const shiftService = {
  async getCurrentShift(): Promise<Shift | null> {
    const res = await api.get<ApiEnvelope<Shift | null>>('/shifts/current')
    return res.data.data
  },

  async openShift(payload: OpenShiftPayload): Promise<Shift> {
    const res = await api.post<ApiEnvelope<Shift>>('/shifts/open', payload)
    return res.data.data
  },

  async closeShift(payload: CloseShiftPayload): Promise<Shift> {
    const res = await api.post<ApiEnvelope<Shift>>('/shifts/close', payload)
    return res.data.data
  },

  async createCashMovement(payload: CashMovementPayload): Promise<Shift> {
    const res = await api.post<ApiEnvelope<Shift>>('/shifts/cash-movement', payload)
    return res.data.data
  },

  async getSummary(): Promise<ShiftSummary> {
    const res = await api.get<ApiEnvelope<ShiftSummary>>('/shifts/summary')
    return res.data.data
  },

  async getHistory(params?: ShiftHistoryParams): Promise<{ items: Shift[]; meta?: PaginationMeta }> {
    const res = await api.get<ApiEnvelope<Shift[]>>('/shifts/history', { params })
    return {
      items: res.data.data,
      meta: res.data.meta,
    }
  },
}
