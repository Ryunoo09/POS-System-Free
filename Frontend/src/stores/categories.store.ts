import { ref } from 'vue'
import { defineStore } from 'pinia'
import { categoriesService } from '@/services/categories.service'
import type { PaginationMeta } from '@/types/api'
import type {
  Category,
  CategoryCreatePayload,
  CategoryListParams,
  CategoryUpdatePayload,
} from '@/types/category'
import { errorMessage } from '@/utils/errors'
import { MAX_PAGE_SIZE } from '@/utils/constants'
import { emptyPaginationMeta } from '@/utils/pagination'

export const useCategoriesStore = defineStore('categories', () => {
  const items = ref<Category[]>([])
  const options = ref<Category[]>([])
  const meta = ref<PaginationMeta>(emptyPaginationMeta())
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref('')

  const fetchCategories = async (params: CategoryListParams): Promise<void> => {
    isLoading.value = true
    error.value = ''

    try {
      const result = await categoriesService.list(params)
      items.value = result.items
      meta.value = result.meta
    } catch (err) {
      error.value = errorMessage(err, 'Gagal memuat kategori.')
    } finally {
      isLoading.value = false
    }
  }

  const fetchCategoryOptions = async (): Promise<void> => {
    try {
      const result = await categoriesService.list({ page: 1, limit: MAX_PAGE_SIZE })
      options.value = result.items
    } catch {
      options.value = []
    }
  }

  const createCategory = async (payload: CategoryCreatePayload): Promise<Category> => {
    isSaving.value = true

    try {
      return await categoriesService.create(payload)
    } finally {
      isSaving.value = false
    }
  }

  const updateCategory = async (id: string, payload: CategoryUpdatePayload): Promise<Category> => {
    isSaving.value = true

    try {
      return await categoriesService.update(id, payload)
    } finally {
      isSaving.value = false
    }
  }

  const deleteCategory = async (id: string): Promise<Category> => {
    isSaving.value = true

    try {
      return await categoriesService.remove(id)
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
    fetchCategories,
    fetchCategoryOptions,
    createCategory,
    updateCategory,
    deleteCategory,
  }
})