import { ref } from 'vue'
import { defineStore } from 'pinia'
import { reportsService } from '@/services/reports.service'
import type { PaginationMeta } from '@/types/api'
import type { DateRange } from '@/types/dashboard'
import type {
  CashierReportRow,
  CategoryCogsRow,
  InventoryValuationPayload,
  ProductReportRow,
  ReportSummary,
  ReportsQuery,
  SalesReportParams,
  SalesReportRow,
  ProductReportParams,
  ValuationParams,
} from '@/types/report'
import { errorMessage } from '@/utils/errors'

const emptyMeta = (): PaginationMeta => ({
  page: 1,
  limit: 10,
  total_items: 0,
  total_pages: 0,
})

export const useReportsStore = defineStore('reports', () => {
  const summary = ref<ReportSummary | null>(null)

  const sales = ref<SalesReportRow[]>([])
  const salesLoading = ref(false)
  const salesError = ref('')

  const products = ref<ProductReportRow[]>([])
  const productsMeta = ref<PaginationMeta>(emptyMeta())
  const productsLoading = ref(false)
  const productsError = ref('')

  const cashiers = ref<CashierReportRow[]>([])
  const cashiersLoading = ref(false)
  const cashiersError = ref('')

  const valuation = ref<InventoryValuationPayload | null>(null)
  const valuationLoading = ref(false)
  const valuationError = ref('')

  const cogs = ref<CategoryCogsRow[]>([])
  const cogsLoading = ref(false)
  const cogsError = ref('')

  const loadSales = async (params: SalesReportParams): Promise<void> => {
    salesLoading.value = true
    salesError.value = ''

    try {
      const payload = await reportsService.getSales(params)
      summary.value = payload.summary
      sales.value = payload.rows
    } catch (error) {
      salesError.value = errorMessage(error, 'Gagal memuat laporan penjualan.')
    } finally {
      salesLoading.value = false
    }
  }

  const loadProducts = async (params: ProductReportParams): Promise<void> => {
    productsLoading.value = true
    productsError.value = ''

    try {
      const payload = await reportsService.getProducts(params)
      summary.value = payload.summary
      products.value = payload.rows
      productsMeta.value = payload.meta
    } catch (error) {
      productsError.value = errorMessage(error, 'Gagal memuat laporan produk.')
    } finally {
      productsLoading.value = false
    }
  }

  const loadCashiers = async (range: DateRange): Promise<void> => {
    cashiersLoading.value = true
    cashiersError.value = ''

    try {
      const payload = await reportsService.getCashiers(range)
      summary.value = payload.summary
      cashiers.value = payload.rows
    } catch (error) {
      cashiersError.value = errorMessage(error, 'Gagal memuat laporan kasir.')
    } finally {
      cashiersLoading.value = false
    }
  }

  const loadValuation = async (params: ValuationParams): Promise<void> => {
    valuationLoading.value = true
    valuationError.value = ''

    try {
      valuation.value = await reportsService.getInventoryValuation(params)
    } catch (error) {
      valuationError.value = errorMessage(error, 'Gagal memuat valuasi inventaris.')
    } finally {
      valuationLoading.value = false
    }
  }

  const loadCogs = async (range: DateRange): Promise<void> => {
    cogsLoading.value = true
    cogsError.value = ''

    try {
      const payload = await reportsService.getCogs(range)
      summary.value = payload.summary
      cogs.value = payload.rows
    } catch (error) {
      cogsError.value = errorMessage(error, 'Gagal memuat laporan laba.')
    } finally {
      cogsLoading.value = false
    }
  }

  const loadAll = async (query: ReportsQuery): Promise<void> => {
    await Promise.all([
      loadSales({ ...query.range, group_by: query.groupBy }),
      loadProducts({
        ...query.range,
        category_id: query.categoryId || undefined,
        sort: query.sort,
        page: query.page,
        limit: query.limit,
      }),
      loadCashiers(query.range),
      loadValuation({}),
      loadCogs(query.range),
    ])
  }

  return {
    summary,
    sales,
    salesLoading,
    salesError,
    products,
    productsMeta,
    productsLoading,
    productsError,
    cashiers,
    cashiersLoading,
    cashiersError,
    valuation,
    valuationLoading,
    valuationError,
    cogs,
    cogsLoading,
    cogsError,
    loadSales,
    loadProducts,
    loadCashiers,
    loadValuation,
    loadCogs,
    loadAll,
  }
})
