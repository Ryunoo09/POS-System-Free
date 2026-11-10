import { ref } from 'vue'
import { defineStore } from 'pinia'
import { purchasesService } from '@/services/purchases.service'
import type { PaginationMeta } from '@/types/api'
import type {
  PurchaseOrder,
  PurchaseOrderCreatePayload,
  PurchaseOrderListParams,
} from '@/types/purchase'
import { errorMessage } from '@/utils/errors'
import { emptyPaginationMeta } from '@/utils/pagination'

export const usePurchasesStore = defineStore('purchases', () => {
  const items = ref<PurchaseOrder[]>([])
  const meta = ref<PaginationMeta>(emptyPaginationMeta())
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref('')

  const fetchPurchaseOrders = async (params: PurchaseOrderListParams): Promise<void> => {
    isLoading.value = true
    error.value = ''

    try {
      const result = await purchasesService.list(params)
      items.value = result.items
      meta.value = result.meta
    } catch (err) {
      error.value = errorMessage(err, 'Gagal memuat purchase order.')
    } finally {
      isLoading.value = false
    }
  }

  const createPurchaseOrder = async (
    payload: PurchaseOrderCreatePayload,
  ): Promise<PurchaseOrder> => {
    isSaving.value = true

    try {
      return await purchasesService.create(payload)
    } finally {
      isSaving.value = false
    }
  }

  const orderPurchaseOrder = async (id: string): Promise<PurchaseOrder> => {
    isSaving.value = true

    try {
      return await purchasesService.order(id)
    } finally {
      isSaving.value = false
    }
  }

  const receivePurchaseOrder = async (id: string): Promise<PurchaseOrder> => {
    isSaving.value = true

    try {
      return await purchasesService.receive(id)
    } finally {
      isSaving.value = false
    }
  }

  const cancelPurchaseOrder = async (id: string): Promise<PurchaseOrder> => {
    isSaving.value = true

    try {
      return await purchasesService.cancel(id)
    } finally {
      isSaving.value = false
    }
  }

  return {
    items,
    meta,
    isLoading,
    isSaving,
    error,
    fetchPurchaseOrders,
    createPurchaseOrder,
    orderPurchaseOrder,
    receivePurchaseOrder,
    cancelPurchaseOrder,
  }
})