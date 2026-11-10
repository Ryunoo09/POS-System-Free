import { ref } from 'vue'
import { defineStore } from 'pinia'
import { suppliersService } from '@/services/suppliers.service'
import type { PaginationMeta } from '@/types/api'
import type {
  Supplier,
  SupplierCreatePayload,
  SupplierListParams,
  SupplierUpdatePayload,
} from '@/types/supplier'
import { MAX_PAGE_SIZE } from '@/utils/constants'
import { errorMessage } from '@/utils/errors'
import { emptyPaginationMeta } from '@/utils/pagination'

export const useSuppliersStore = defineStore('suppliers', () => {
  const items = ref<Supplier[]>([])
  const options = ref<Supplier[]>([])
  const meta = ref<PaginationMeta>(emptyPaginationMeta())
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref('')

  const fetchSuppliers = async (params: SupplierListParams): Promise<void> => {
    isLoading.value = true
    error.value = ''

    try {
      const result = await suppliersService.list(params)
      items.value = result.items
      meta.value = result.meta
    } catch (err) {
      error.value = errorMessage(err, 'Gagal memuat supplier.')
    } finally {
      isLoading.value = false
    }
  }

  const fetchSupplierOptions = async (): Promise<void> => {
    try {
      const result = await suppliersService.list({
        page: 1,
        limit: MAX_PAGE_SIZE,
        is_active: 'true',
      })
      options.value = result.items
    } catch {
      options.value = []
    }
  }

  const createSupplier = async (payload: SupplierCreatePayload): Promise<Supplier> => {
    isSaving.value = true

    try {
      return await suppliersService.create(payload)
    } finally {
      isSaving.value = false
    }
  }

  const updateSupplier = async (id: string, payload: SupplierUpdatePayload): Promise<Supplier> => {
    isSaving.value = true

    try {
      return await suppliersService.update(id, payload)
    } finally {
      isSaving.value = false
    }
  }

  const deleteSupplier = async (id: string): Promise<Supplier> => {
    isSaving.value = true

    try {
      return await suppliersService.remove(id)
    } finally {
      isSaving.value = false
    }
  }

  return {
    items,
    options,
    meta,
    isLoading,
    isSaving,
    error,
    fetchSuppliers,
    fetchSupplierOptions,
    createSupplier,
    updateSupplier,
    deleteSupplier,
  }
})