import type { CategoryFilterState, CategoryListParams } from '@/types/category'
import type { ProductFilterState, ProductListParams } from '@/types/product'
import type { UserFilterState, UserListParams } from '@/types/user'
import { DEFAULT_PAGE_SIZE } from './constants'

export const toProductParams = (
  filters: ProductFilterState,
  page: number,
  limit = DEFAULT_PAGE_SIZE,
): ProductListParams => {
  const params: ProductListParams = { page, limit }
  const search = filters.search.trim()

  if (search) params.search = search
  if (filters.category_id) params.category_id = filters.category_id
  if (filters.is_active === 'true' || filters.is_active === 'false') {
    params.is_active = filters.is_active
  }

  return params
}

export const toCategoryParams = (
  filters: CategoryFilterState,
  page: number,
  limit = DEFAULT_PAGE_SIZE,
): CategoryListParams => {
  const params: CategoryListParams = { page, limit }
  const search = filters.search.trim()

  if (search) params.search = search
  if (filters.is_active === 'true' || filters.is_active === 'false') {
    params.is_active = filters.is_active
  }

  return params
}

export const toUserParams = (
  filters: UserFilterState,
  page: number,
  limit = DEFAULT_PAGE_SIZE,
): UserListParams => {
  const params: UserListParams = { page, limit }
  const search = filters.search.trim()

  if (search) params.search = search
  if (filters.role) params.role = filters.role
  if (filters.is_active === 'true' || filters.is_active === 'false') {
    params.is_active = filters.is_active
  }

  return params
}