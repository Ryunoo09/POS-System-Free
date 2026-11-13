import { cacheKeys } from '../cache/cache-keys.js'
import { CACHE_TTL, noopCache, type CacheService } from '../cache/cache.service.js'
import type { ReportRepository, SalesGroupBy } from '../repositories/report.repository.js'
import type { PaginationMeta } from '../types/http.js'
import {
  resolveDateRange,
  todayInJakarta,
  type DateRangeInput,
  type ResolvedDateRange,
} from '../utils/date-range.js'
import { buildPaginationMeta, toSkip } from '../utils/pagination.js'
import type {
  CashierReportQuery,
  CogsReportQuery,
  ProductReportQuery,
  SalesReportQuery,
  ValuationQuery,
} from '../validators/report.validator.js'

export interface ReportSummaryDto {
  revenue: string
  cogs: string
  gross_profit: string
  gross_margin_pct: string
  transaction_count: number
}

export interface SalesReportRowDto {
  period: string
  period_label: string
  transaction_count: number
  revenue: string
  cogs: string
  gross_profit: string
  gross_margin_pct: string
}

export interface ProductReportRowDto {
  product_id: string
  sku: string
  name: string
  category: string | null
  quantity_sold: number
  revenue: string
  cogs: string
  gross_profit: string
  gross_margin_pct: string
}

export interface CategoryCogsReportRowDto {
  category_id: string | null
  category: string
  quantity_sold: number
  revenue: string
  cogs: string
  gross_profit: string
  gross_margin_pct: string
}

export interface CashierReportRowDto {
  cashier_id: string
  cashier_name: string
  transaction_count: number
  revenue: string
  gross_profit: string
  average_transaction: string
}

export interface ReportService {
  getSales: (
    query: SalesReportQuery,
  ) => Promise<{ summary: ReportSummaryDto; rows: SalesReportRowDto[] }>
  getProducts: (
    query: ProductReportQuery,
  ) => Promise<{ summary: ReportSummaryDto; rows: ProductReportRowDto[]; meta: PaginationMeta }>
  getCashiers: (
    query: CashierReportQuery,
  ) => Promise<{ summary: ReportSummaryDto; rows: CashierReportRowDto[] }>
  getInventoryValuation: (query: ValuationQuery) => Promise<InventoryValuationDto>
  getCogs: (
    query: CogsReportQuery,
  ) => Promise<{ summary: ReportSummaryDto; rows: CategoryCogsReportRowDto[] }>
}

export interface ValuationItemDto {
  product_id: string
  sku: string
  name: string
  category: string
  stock: number
  average_cost: string
  inventory_value: string
}

export interface ValuationCategoryDto {
  category_id: string | null
  category: string
  quantity: number
  value: string
}

export interface InventoryValuationDto {
  total_value: string
  total_quantity: number
  items: ValuationItemDto[]
  by_category: ValuationCategoryDto[]
}

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
]

const LONG_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

const addDays = (value: string, days: number): string => {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

const formatShort = (value: string): string => {
  const [year, month, day] = value.split('-')
  return `${Number(day)} ${SHORT_MONTHS[Number(month) - 1]} ${year}`
}

const formatLong = (value: string): string => {
  const [year, month] = value.split('-')
  return `${LONG_MONTHS[Number(month) - 1]} ${year}`
}

const periodLabel = (period: string, groupBy: SalesGroupBy): string => {
  if (groupBy === 'monthly') return formatLong(period)
  if (groupBy === 'weekly') return `${formatShort(period)} – ${formatShort(addDays(period, 6))}`
  return formatShort(period)
}

export const createReportService = ({
  reportRepository,
  cache = noopCache,
}: {
  reportRepository: ReportRepository
  cache?: CacheService
}): ReportService => {
  const resolve = (query: DateRangeInput) => resolveDateRange(query)

  // Rentang yang sudah lewat praktis immutable, jadi cache boleh berumur lebih panjang.
  const ttlFor = (range: ResolvedDateRange): number =>
    range.endDate >= todayInJakarta() ? CACHE_TTL.report : CACHE_TTL.reportPast

  const marginPct = (revenue: string, grossProfit: string): string => {
    const revenueValue = Number(revenue)
    if (!revenueValue) return '0.00'

    return ((Number(grossProfit) / revenueValue) * 100).toFixed(2)
  }

  const toSummary = (totals: Awaited<ReturnType<ReportRepository['getSummary']>>): ReportSummaryDto => ({
    revenue: totals.revenue,
    cogs: totals.cogs,
    gross_profit: totals.grossProfit,
    gross_margin_pct: marginPct(totals.revenue, totals.grossProfit),
    transaction_count: totals.transactionCount,
  })

  return {
    getSales: async (query) => {
      const range = resolve(query)

      return cache.getOrSet(
        cacheKeys.reportSales(range.startDate, range.endDate, query.group_by),
        ttlFor(range),
        async () => {
          const [totals, rows] = await Promise.all([
            reportRepository.getSummary(range),
            reportRepository.getPeriodSales(range, query.group_by),
          ])

          return {
            summary: toSummary(totals),
            rows: rows.map((row) => ({
              period: row.period,
              period_label: periodLabel(row.period, query.group_by),
              transaction_count: row.transactionCount,
              revenue: row.revenue,
              cogs: row.cogs,
              gross_profit: row.grossProfit,
              gross_margin_pct: marginPct(row.revenue, row.grossProfit),
            })),
          }
        },
      )
    },

    getProducts: async (query) => {
      const range = resolve(query)

      return cache.getOrSetVersioned(
        'products',
        (version) =>
          cacheKeys.reportProducts(version, {
            start: range.startDate,
            end: range.endDate,
            categoryId: query.category_id,
            sort: query.sort,
            page: query.page,
            limit: query.limit,
          }),
        ttlFor(range),
        async () => {
          const [totals, result] = await Promise.all([
            reportRepository.getSummary(range),
            reportRepository.listProductSales(range, {
              skip: toSkip(query.page, query.limit),
              take: query.limit,
              categoryId: query.category_id,
              sort: query.sort,
            }),
          ])

          return {
            summary: toSummary(totals),
            rows: result.items.map((row) => ({
              product_id: row.productId,
              sku: row.sku,
              name: row.name,
              category: row.category,
              quantity_sold: row.quantitySold,
              revenue: row.revenue,
              cogs: row.cogs,
              gross_profit: row.grossProfit,
              gross_margin_pct: marginPct(row.revenue, row.grossProfit),
            })),
            meta: buildPaginationMeta(query.page, query.limit, result.total),
          }
        },
      )
    },

    getCashiers: async (query) => {
      const range = resolve(query)

      return cache.getOrSet(cacheKeys.reportCashiers(range.startDate, range.endDate), ttlFor(range), async () => {
        const [totals, rows] = await Promise.all([
          reportRepository.getSummary(range),
          reportRepository.listCashierSales(range),
        ])

        return {
          summary: toSummary(totals),
          rows: rows.map((row) => ({
            cashier_id: row.cashierId,
            cashier_name: row.cashierName,
            transaction_count: row.transactionCount,
            revenue: row.revenue,
            gross_profit: row.grossProfit,
            average_transaction: row.averageTransaction,
          })),
        }
      })
    },

    getInventoryValuation: async (query) => {
      return cache.getOrSetVersioned(
        'inventory',
        (version) => cacheKeys.reportValuation(version, query.category_id),
        CACHE_TTL.inventory,
        async () => {
          const valuation = await reportRepository.getInventoryValuation({
            categoryId: query.category_id,
          })

          return {
            total_value: valuation.totalValue,
            total_quantity: valuation.totalQuantity,
            items: valuation.items.map((row) => ({
              product_id: row.productId,
              sku: row.sku,
              name: row.name,
              category: row.category,
              stock: row.stock,
              average_cost: row.averageCost,
              inventory_value: row.inventoryValue,
            })),
            by_category: valuation.byCategory.map((row) => ({
              category_id: row.categoryId,
              category: row.category,
              quantity: row.quantity,
              value: row.value,
            })),
          }
        },
      )
    },

    getCogs: async (query) => {
      const range = resolve(query)

      return cache.getOrSetVersioned(
        'products',
        (version) =>
          cacheKeys.reportCogs(version, {
            start: range.startDate,
            end: range.endDate,
            categoryId: query.category_id,
          }),
        ttlFor(range),
        async () => {
          const [totals, rows] = await Promise.all([
            reportRepository.getSummary(range),
            reportRepository.getCategoryCogs(range, query.category_id),
          ])

          return {
            summary: toSummary(totals),
            rows: rows.map((row) => ({
              category_id: row.categoryId,
              category: row.category,
              quantity_sold: row.quantitySold,
              revenue: row.revenue,
              cogs: row.cogs,
              gross_profit: row.grossProfit,
              gross_margin_pct: marginPct(row.revenue, row.grossProfit),
            })),
          }
        },
      )
    },
  }
}
