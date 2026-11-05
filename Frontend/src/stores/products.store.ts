import { ref } from 'vue'
import { defineStore } from 'pinia'
import { productsService } from '@/services/products.service'
import type { PaginationMeta } from '@/types/api'
import type {
  Product,
  ProductCreatePayload,
  ProductListParams,
  ProductUpdatePayload,
} from '@/types/product'
import { errorMessage } from '@/utils/errors'
import { emptyPaginationMeta } from '@/utils/pagination'

export const useProductsStore = defineStore('products', () => {
  const items = ref<Product[]>([])
  const meta = ref<PaginationMeta>(emptyPaginationMeta())
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref('')

  const fetchProducts = async (params: ProductListParams): Promise<void> => {
    isLoading.value = true
    error.value = ''

    try {
      const result = await productsService.list(params)
      items.value = result.items
      meta.value = result.meta
    } catch (err) {
      error.value = errorMessage(err, 'Gagal memuat produk.')
    } finally {
      isLoading.value = false
    }
  }

  const createProduct = async (payload: ProductCreatePayload): Promise<Product> => {
    isSaving.value = true

    try {
      return await productsService.create(payload)
    } finally {
      isSaving.value = false
    }
  }

  const updateProduct = async (id: string, payload: ProductUpdatePayload): Promise<Product> => {
    isSaving.value = true

    try {
      return await productsService.update(id, payload)
    } finally {
      isSaving.value = false
    }
  }

  const deactivateProduct = async (id: string): Promise<Product> => {
    isSaving.value = true

    try {
      return await productsService.deactivate(id)
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
    fetchProducts,
    createProduct,
    updateProduct,
    deactivateProduct,
  }
})