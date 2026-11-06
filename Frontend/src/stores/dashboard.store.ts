import { ref } from 'vue'
import { defineStore } from 'pinia'
import { dashboardService } from '@/services/dashboard.service'
import { inventoryService } from '@/services/inventory.service'
import { transactionsService } from '@/services/transactions.service'
import type { DailySales, DashboardSummary, DateRange, TopProduct } from '@/types/dashboard'
import type { Product } from '@/types/product'
import type { TransactionSummary } from '@/types/transaction'
import { errorMessage } from '@/utils/errors'

export const useDashboardStore = defineStore('dashboard', () => {
  const summary = ref<DashboardSummary | null>(null)
  const summaryLoading = ref(false)
  const summaryError = ref('')

  const sales = ref<DailySales[]>([])
  const salesLoading = ref(false)
  const salesError = ref('')

  const topProducts = ref<TopProduct[]>([])
  const topProductsLoading = ref(false)
  const topProductsError = ref('')

  const lowStock = ref<Product[]>([])
  const lowStockLoading = ref(false)
  const lowStockError = ref('')

  const recentTransactions = ref<TransactionSummary[]>([])
  const recentTransactionsLoading = ref(false)
  const recentTransactionsError = ref('')

  const loadSummary = async (range: DateRange): Promise<void> => {
    summaryLoading.value = true
    summaryError.value = ''

    try {
      summary.value = await dashboardService.getSummary(range)
    } catch (error) {
      summaryError.value = errorMessage(error, 'Gagal memuat ringkasan.')
    } finally {
      summaryLoading.value = false
    }
  }

  const loadSales = async (range: DateRange): Promise<void> => {
    salesLoading.value = true
    salesError.value = ''

    try {
      sales.value = await dashboardService.getSales(range)
    } catch (error) {
      salesError.value = errorMessage(error, 'Gagal memuat grafik penjualan.')
    } finally {
      salesLoading.value = false
    }
  }

  const loadTopProducts = async (range: DateRange): Promise<void> => {
    topProductsLoading.value = true
    topProductsError.value = ''

    try {
      topProducts.value = await dashboardService.getTopProducts(range)
    } catch (error) {
      topProductsError.value = errorMessage(error, 'Gagal memuat produk terlaris.')
    } finally {
      topProductsLoading.value = false
    }
  }

  const loadLowStock = async (): Promise<void> => {
    lowStockLoading.value = true
    lowStockError.value = ''

    try {
      const result = await inventoryService.listLowStock({ page: 1, limit: 10 })
      lowStock.value = result.items
    } catch (error) {
      lowStockError.value = errorMessage(error, 'Gagal memuat stok rendah.')
    } finally {
      lowStockLoading.value = false
    }
  }

  const loadRecentTransactions = async (range: DateRange): Promise<void> => {
    recentTransactionsLoading.value = true
    recentTransactionsError.value = ''

    try {
      recentTransactions.value = await transactionsService.recent(range)
    } catch (error) {
      recentTransactionsError.value = errorMessage(error, 'Gagal memuat transaksi terbaru.')
    } finally {
      recentTransactionsLoading.value = false
    }
  }

  const loadAll = async (range: DateRange): Promise<void> => {
    await Promise.all([
      loadSummary(range),
      loadSales(range),
      loadTopProducts(range),
      loadLowStock(),
      loadRecentTransactions(range),
    ])
  }

  return {
    summary,
    summaryLoading,
    summaryError,
    sales,
    salesLoading,
    salesError,
    topProducts,
    topProductsLoading,
    topProductsError,
    lowStock,
    lowStockLoading,
    lowStockError,
    recentTransactions,
    recentTransactionsLoading,
    recentTransactionsError,
    loadSummary,
    loadSales,
    loadTopProducts,
    loadLowStock,
    loadRecentTransactions,
    loadAll,
  }
})