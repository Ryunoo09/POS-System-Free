import { ref } from 'vue'
import { defineStore } from 'pinia'
import { inventoryService } from '@/services/inventory.service'
import type { PaginationMeta } from '@/types/api'
import type {
  AdjustStockPayload,
  AdjustStockResult,
  InventoryListParams,
  InventoryProduct,
  LowStockParams,
  MovementListParams,
  StockMovement,
} from '@/types/inventory'
import type { Product } from '@/types/product'
import { errorMessage } from '@/utils/errors'
import { emptyPaginationMeta } from '@/utils/pagination'

export const useInventoryStore = defineStore('inventory', () => {
  const stockItems = ref<InventoryProduct[]>([])
  const stockMeta = ref<PaginationMeta>(emptyPaginationMeta())
  const stockLoading = ref(false)
  const stockError = ref('')

  const lowStockItems = ref<Product[]>([])
  const lowStockMeta = ref<PaginationMeta>(emptyPaginationMeta())
  const lowStockLoading = ref(false)
  const lowStockError = ref('')

  const movementItems = ref<StockMovement[]>([])
  const movementMeta = ref<PaginationMeta>(emptyPaginationMeta())
  const movementLoading = ref(false)
  const movementError = ref('')

  const isSaving = ref(false)

  // Pergerakan di-refresh cepat (buka tab + ganti filter); hanya respons terbaru
  // yang boleh menimpa state agar respons lama tidak menang balapan.
  let movementRequestId = 0

  const fetchStock = async (params: InventoryListParams): Promise<void> => {
    stockLoading.value = true
    stockError.value = ''

    try {
      const result = await inventoryService.list(params)
      stockItems.value = result.items
      stockMeta.value = result.meta
    } catch (error) {
      stockError.value = errorMessage(error, 'Gagal memuat data stok.')
    } finally {
      stockLoading.value = false
    }
  }

  const fetchLowStock = async (params: LowStockParams): Promise<void> => {
    lowStockLoading.value = true
    lowStockError.value = ''

    try {
      const result = await inventoryService.listLowStock(params)
      lowStockItems.value = result.items
      lowStockMeta.value = result.meta
    } catch (error) {
      lowStockError.value = errorMessage(error, 'Gagal memuat stok rendah.')
    } finally {
      lowStockLoading.value = false
    }
  }

  const fetchMovements = async (params: MovementListParams): Promise<void> => {
    const requestId = ++movementRequestId
    movementLoading.value = true
    movementError.value = ''

    try {
      const result = await inventoryService.listMovements(params)

      if (requestId !== movementRequestId) return

      movementItems.value = result.items
      movementMeta.value = result.meta
    } catch (error) {
      if (requestId !== movementRequestId) return

      movementError.value = errorMessage(error, 'Gagal memuat riwayat stok.')
    } finally {
      if (requestId === movementRequestId) movementLoading.value = false
    }
  }

  const adjust = async (payload: AdjustStockPayload): Promise<AdjustStockResult> => {
    isSaving.value = true

    try {
      return await inventoryService.adjust(payload)
    } finally {
      isSaving.value = false
    }
  }

  return {
    stockItems,
    stockMeta,
    stockLoading,
    stockError,
    lowStockItems,
    lowStockMeta,
    lowStockLoading,
    lowStockError,
    movementItems,
    movementMeta,
    movementLoading,
    movementError,
    isSaving,
    fetchStock,
    fetchLowStock,
    fetchMovements,
    adjust,
  }
})