import type { Category } from '@prisma/client'

export type CategoryWithCount = Category & { _count: { products: number } }

export interface CategoryDto {
  id: string
  name: string
  description: string | null
  is_active: boolean
  product_count: number
  created_at: string
  updated_at: string
}

export const toCategoryDto = (category: CategoryWithCount): CategoryDto => ({
  id: category.id,
  name: category.name,
  description: category.description,
  is_active: category.isActive,
  product_count: category._count.products,
  created_at: category.createdAt.toISOString(),
  updated_at: category.updatedAt.toISOString(),
})
