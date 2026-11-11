import { ref } from 'vue'
import { defineStore } from 'pinia'
import { pricesService } from '@/services/prices.service'
import type {
  BulkPriceApplyPayload,
  BulkPriceItem,
  BulkPricePayload,
  PriceHistoryEntry,
  SchedulePricePayload,
  ScheduledPrice,
} from '@/types/price'
import { errorMessage } from '@/utils/errors'

export const usePricesStore = defineStore('prices', () => {
  const history = ref<PriceHistoryEntry[]>([])
  const schedule = ref<ScheduledPrice | null>(null)
  const preview = ref<BulkPriceItem[]>([])
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref('')

  const fetchHistory = async (productId: string): Promise<void> => {
    isLoading.value = true
    error.value = ''

    try {
      history.value = await pricesService.history(productId)
    } catch (err) {
      error.value = errorMessage(err, 'Gagal memuat riwayat harga.')
    } finally {
      isLoading.value = false
    }
  }

  const fetchSchedule = async (productId: string): Promise<void> => {
    try {
      schedule.value = await pricesService.activeSchedule(productId)
    } catch (err) {
      error.value = errorMessage(err, 'Gagal memuat jadwal harga.')
    }
  }

  const saveSchedule = async (
    productId: string,
    payload: SchedulePricePayload,
  ): Promise<void> => {
    isSaving.value = true

    try {
      schedule.value = await pricesService.schedule(productId, payload)
    } finally {
      isSaving.value = false
    }
  }

  const cancelSchedule = async (productId: string, scheduleId: string): Promise<void> => {
    isSaving.value = true

    try {
      await pricesService.cancelSchedule(productId, scheduleId)
      schedule.value = null
    } finally {
      isSaving.value = false
    }
  }

  const previewBulk = async (payload: BulkPricePayload): Promise<void> => {
    isSaving.value = true

    try {
      preview.value = await pricesService.bulkPreview(payload)
    } finally {
      isSaving.value = false
    }
  }

  const applyBulk = async (payload: BulkPriceApplyPayload): Promise<number> => {
    isSaving.value = true

    try {
      const result = await pricesService.bulkApply(payload)
      return result.updated
    } finally {
      isSaving.value = false
    }
  }

  const clearPreview = (): void => {
    preview.value = []
  }

  return {
    history,
    schedule,
    preview,
    isLoading,
    isSaving,
    error,
    fetchHistory,
    fetchSchedule,
    saveSchedule,
    cancelSchedule,
    previewBulk,
    applyBulk,
    clearPreview,
  }
})