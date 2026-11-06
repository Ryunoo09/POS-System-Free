import { ref } from 'vue'
import { defineStore } from 'pinia'
import { transactionsService } from '@/services/transactions.service'
import type { PaginationMeta } from '@/types/api'
import type {
  TransactionCashierOption,
  TransactionDetail,
  TransactionListParams,
  TransactionSummary,
} from '@/types/transaction'
import { ApiError } from '@/utils/api-error'
import { errorMessage } from '@/utils/errors'
import { emptyPaginationMeta } from '@/utils/pagination'

export const useTransactionsStore = defineStore('transactions', () => {
  const items = ref<TransactionSummary[]>([])
  const meta = ref<PaginationMeta>(emptyPaginationMeta())
  const isLoading = ref(false)
  const error = ref('')

  const detail = ref<TransactionDetail | null>(null)
  const detailLoading = ref(false)
  const detailError = ref('')
  const detailNotFound = ref(false)

  const cashiers = ref<TransactionCashierOption[]>([])
  const cashiersLoading = ref(false)

  const fetchList = async (params: TransactionListParams): Promise<void> => {
    isLoading.value = true
    error.value = ''

    try {
      const result = await transactionsService.list(params)
      items.value = result.items
      meta.value = result.meta
    } catch (err) {
      error.value = errorMessage(err, 'Gagal memuat transaksi.')
    } finally {
      isLoading.value = false
    }
  }

  const fetchDetail = async (id: string): Promise<void> => {
    detailLoading.value = true
    detailError.value = ''
    detailNotFound.value = false
    detail.value = null

    try {
      detail.value = await transactionsService.detail(id)
    } catch (err) {
      detailError.value = errorMessage(err, 'Gagal memuat detail transaksi.')
      detailNotFound.value = err instanceof ApiError && err.status === 404
    } finally {
      detailLoading.value = false
    }
  }

  const fetchCashiers = async (): Promise<void> => {
    cashiersLoading.value = true

    try {
      cashiers.value = await transactionsService.cashiers()
    } finally {
      cashiersLoading.value = false
    }
  }

  const clearDetail = (): void => {
    detail.value = null
    detailError.value = ''
    detailNotFound.value = false
  }

  return {
    items,
    meta,
    isLoading,
    error,
    detail,
    detailLoading,
    detailError,
    detailNotFound,
    cashiers,
    cashiersLoading,
    fetchList,
    fetchDetail,
    fetchCashiers,
    clearDetail,
  }
})
