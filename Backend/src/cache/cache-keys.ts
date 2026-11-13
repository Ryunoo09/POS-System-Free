import { createHash } from 'node:crypto'
import { env } from '../config/env.js'

const P = env.REDIS_KEY_PREFIX

export const NAMESPACES = ['products', 'categories', 'inventory', 'dashboard'] as const
export type CacheNamespace = (typeof NAMESPACES)[number]

/**
 * Kunci versi namespace. `INCR` pada kunci ini = invalidasi massal tanpa
 * `SCAN`/`KEYS`; key lama akan kedaluwarsa sendiri oleh TTL.
 */
export const namespaceVersionKey = (namespace: CacheNamespace): string =>
  `${P}:ver:${namespace}`

/** `0` = tanpa harga modal (cashier), `1` = boleh lihat harga modal. */
const scopeOf = (canViewCostPrice: boolean): string => (canViewCostPrice ? '1' : '0')

/** Hash filter untuk menjaga kardinalitas key tetap terbatas. */
export const filterHash = (input: Record<string, unknown>): string => {
  const normalized = Object.entries(input)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => [
      key,
      typeof value === 'string' ? value.trim().toLowerCase() : value,
    ] as const)
    .sort(([a], [b]) => a.localeCompare(b))

  return createHash('sha1').update(JSON.stringify(normalized)).digest('hex').slice(0, 16)
}

export interface CategoryListKeyInput {
  scope: 'all' | 'active' | 'inactive'
  page: number
  limit: number
  search?: string | undefined
}

export interface ProductListKeyInput extends Record<string, unknown> {
  scope: 'all' | 'active'
  page: number
  limit: number
  search?: string | undefined
  barcode?: string | undefined
  categoryId?: string | undefined
  costView: boolean
}

export interface ReportFilterKeyInput extends Record<string, unknown> {
  start: string
  end: string
  categoryId?: string | undefined
  sort?: string | undefined
  page?: number | undefined
  limit?: number | undefined
}

export const cacheKeys = {
  categoryList: (version: string, input: CategoryListKeyInput): string =>
    `${P}:cat:list:v${version}:${input.scope}:p${input.page}:l${input.limit}:s${filterHash({ search: input.search })}`,

  productDetail: (productId: string, costView: boolean): string =>
    `${P}:prod:detail:${productId}:${scopeOf(costView)}`,

  productBarcode: (barcode: string, costView: boolean): string =>
    `${P}:prod:barcode:${barcode}:${scopeOf(costView)}`,

  productList: (version: string, input: ProductListKeyInput): string =>
    `${P}:prod:list:v${version}:${filterHash(input)}`,

  dashboardSummary: (start: string, end: string): string => `${P}:dash:summary:${start}:${end}`,
  dashboardSales: (start: string, end: string): string => `${P}:dash:sales:${start}:${end}`,
  dashboardBreakdown: (start: string, end: string): string => `${P}:dash:breakdown:${start}:${end}`,
  dashboardTopProducts: (start: string, end: string, limit: number): string =>
    `${P}:dash:top:${start}:${end}:l${limit}`,

  reportSales: (start: string, end: string, groupBy: string): string =>
    `${P}:rep:sales:${start}:${end}:${groupBy}`,
  reportProducts: (version: string, input: ReportFilterKeyInput): string =>
    `${P}:rep:prod:v${version}:${filterHash(input)}`,
  reportCashiers: (start: string, end: string): string => `${P}:rep:cashier:${start}:${end}`,
  reportCogs: (version: string, input: ReportFilterKeyInput): string =>
    `${P}:rep:cogs:v${version}:${filterHash(input)}`,

  inventoryLowStock: (version: string, page: number, limit: number): string =>
    `${P}:inv:lowstock:v${version}:p${page}:l${limit}`,

  loginRateLimit: (ip: string, emailHash: string): string =>
    `${P}:rl:login:${ip}:${emailHash}`,
} as const
