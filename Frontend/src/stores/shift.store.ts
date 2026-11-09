import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { shiftService } from '@/services/shift.service'
import type {
  CashMovementPayload,
  CloseShiftPayload,
  OpenShiftPayload,
  Shift,
  ShiftHistoryParams,
  ShiftSummary,
} from '@/types/shift'

export const useShiftStore = defineStore('shift', () => {
  const currentShift = ref<Shift | null>(null)
  const summary = ref<ShiftSummary | null>(null)
  const history = ref<Shift[]>([])
  const isLoading = ref(false)
  const isActionLoading = ref(false)
  const error = ref<string | null>(null)

  const isShiftOpen = computed(() => currentShift.value?.status === 'OPEN')

  const fetchCurrentShift = async (): Promise<Shift | null> => {
    isLoading.value = true
    error.value = null
    try {
      const shift = await shiftService.getCurrentShift()
      currentShift.value = shift
      return shift
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Gagal memuat status shift'
      return null
    } finally {
      isLoading.value = false
    }
  }

  const openShift = async (payload: OpenShiftPayload): Promise<Shift> => {
    isActionLoading.value = true
    error.value = null
    try {
      const shift = await shiftService.openShift(payload)
      currentShift.value = shift
      return shift
    } finally {
      isActionLoading.value = false
    }
  }

  const closeShift = async (payload: CloseShiftPayload): Promise<Shift> => {
    isActionLoading.value = true
    error.value = null
    try {
      const shift = await shiftService.closeShift(payload)
      currentShift.value = null
      summary.value = null
      return shift
    } finally {
      isActionLoading.value = false
    }
  }

  const createCashMovement = async (payload: CashMovementPayload): Promise<Shift> => {
    isActionLoading.value = true
    error.value = null
    try {
      const shift = await shiftService.createCashMovement(payload)
      currentShift.value = shift
      return shift
    } finally {
      isActionLoading.value = false
    }
  }

  const fetchSummary = async (): Promise<ShiftSummary | null> => {
    isLoading.value = true
    try {
      const data = await shiftService.getSummary()
      summary.value = data
      return data
    } catch {
      return null
    } finally {
      isLoading.value = false
    }
  }

  const fetchHistory = async (params?: ShiftHistoryParams) => {
    isLoading.value = true
    error.value = null
    try {
      const res = await shiftService.getHistory(params)
      history.value = res.items
      return res
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Gagal memuat riwayat shift'
      return { items: [], meta: undefined }
    } finally {
      isLoading.value = false
    }
  }

  return {
    currentShift,
    summary,
    history,
    isLoading,
    isActionLoading,
    error,
    isShiftOpen,
    fetchCurrentShift,
    openShift,
    closeShift,
    createCashMovement,
    fetchSummary,
    fetchHistory,
  }
})
