import type { PaginationMeta } from '../types/http.js'

export const toSkip = (page: number, limit: number): number => (page - 1) * limit

export const buildPaginationMeta = (
  page: number,
  limit: number,
  totalItems: number,
): PaginationMeta => ({
  page,
  limit,
  total_items: totalItems,
  total_pages: Math.ceil(totalItems / limit),
})
