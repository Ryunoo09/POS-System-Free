import { http } from './api'
import type {
  BulkPriceApplyPayload,
  BulkPriceItem,
  BulkPricePayload,
  PriceHistoryEntry,
  SchedulePricePayload,
  ScheduledPrice,
} from '@/types/price'

export const pricesService = {
  async history(productId: string): Promise<PriceHistoryEntry[]> {
    const response = await http.get<PriceHistoryEntry[]>(`/products/${productId}/price-history`)
    return response.data
  },

  async schedule(productId: string, payload: SchedulePricePayload): Promise<ScheduledPrice> {
    const response = await http.post<ScheduledPrice>(
      `/products/${productId}/scheduled-price`,
      payload,
    )
    return response.data
  },

  async activeSchedule(productId: string): Promise<ScheduledPrice | null> {
    const response = await http.get<ScheduledPrice | null>(
      `/products/${productId}/scheduled-price`,
    )
    return response.data
  },

  async cancelSchedule(productId: string, scheduleId: string): Promise<void> {
    await http.delete<null>(`/products/${productId}/scheduled-price/${scheduleId}`)
  },

  async bulkPreview(payload: BulkPricePayload): Promise<BulkPriceItem[]> {
    const response = await http.post<BulkPriceItem[]>('/products/bulk-price/preview', payload)
    return response.data
  },

  async bulkApply(payload: BulkPriceApplyPayload): Promise<{ updated: number }> {
    const response = await http.post<{ updated: number }>('/products/bulk-price', payload)
    return response.data
  },
}
