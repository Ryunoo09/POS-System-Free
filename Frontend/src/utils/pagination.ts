import type { PaginationMeta } from '@/types/api'
import { DEFAULT_PAGE_SIZE } from './constants'

export const emptyPaginationMeta = (limit = DEFAULT_PAGE_SIZE): PaginationMeta => ({
  page: 1,
  limit,
  total_items: 0,
  total_pages: 0,
})