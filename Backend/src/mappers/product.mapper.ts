import type { Category, Product } from '@prisma/client'

export type ProductWithCategory = Product & { category: Pick<Category, 'id' | 'name'> }

export interface ProductDto {
  id: string
  sku: string
  barcode: string | null
  name: string
  description: string | null
  category: { id: string; name: string }
  unit: string
  cost_price?: string
  selling_price: string
  stock: number
  min_stock: number
  is_low_stock: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProductMapperOptions {
  canViewCostPrice: boolean
}

/**
 * Satu-satunya tempat penyembunyian `cost_price` (FR-PROD-006).
 */
export const toProductDto = (
  product: ProductWithCategory,
  options: ProductMapperOptions,
): ProductDto => {
  const dto: ProductDto = {
    id: product.id,
    sku: product.sku,
    barcode: product.barcode,
    name: product.name,
    description: product.description,
    category: { id: product.category.id, name: product.category.name },
    unit: product.unit,
    selling_price: product.sellingPrice.toFixed(2),
    stock: product.stock,
    min_stock: product.minStock,
    is_low_stock: product.stock <= product.minStock,
    is_active: product.isActive,
    created_at: product.createdAt.toISOString(),
    updated_at: product.updatedAt.toISOString(),
  }

  if (options.canViewCostPrice) {
    dto.cost_price = product.costPrice.toFixed(2)
  }

  return dto
}
