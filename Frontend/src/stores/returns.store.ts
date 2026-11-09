import { ref } from 'vue'
import { defineStore } from 'pinia'
import { returnsService } from '@/services/returns.service'
import type { PaginationMeta } from '@/types/api'
import type { ReturnCreatePayload, ReturnListParams, ReturnRecord } from '@/types/return'
import { errorMessage } from '@/utils/errors'
import { emptyPaginationMeta } from '@/utils/pagination'

export const useReturnsStore = defineStore('returns', () => {
  const items = ref<ReturnRecord[]>([])
  const meta = ref<PaginationMeta>(emptyPaginationMeta())
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref('')

  const fetchList = async (params: ReturnListParams): Promise<void> => {
    isLoading.value = true
    error.value = ''

    try {
      const result = await returnsService.list(params)
      items.value = result.items
      meta.value = result.meta
    } catch (err) {
      error.value = errorMessage(err, 'Gagal memuat data retur.')
    } finally {
      isLoading.value = false
    }
  }

  const createReturn = async (payload: ReturnCreatePayload): Promise<ReturnRecord> => {
    isSaving.value = true

    try {
      return await returnsService.create(payload)
    } finally {
      isSaving.value = false
    }
  }

  /** Retur milik satu transaksi; dipakai untuk menghitung sisa kuantitas yang bisa diretur. */
  const fetchForTransaction = async (transactionId: string): Promise<ReturnRecord[]> => {
    const result = await returnsService.list({
      page: 1,
      limit: 100,
      transaction_id: transactionId,
    })

    return result.items
  }

  return { items, meta, isLoading, isSaving, error, fetchList, createReturn, fetchForTransaction }
})