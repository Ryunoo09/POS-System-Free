import { toProductDto, type ProductDto, type ProductWithCategory } from './product.mapper.js'

export interface InventoryProductDto extends ProductDto {
  /** Nilai stok saat ini: stock × cost_price. */
  stock_value: string
}

export const toInventoryProductDto = (product: ProductWithCategory): InventoryProductDto => ({
  ...toProductDto(product, { canViewCostPrice: true }),
  stock_value: product.costPrice.times(product.stock).toFixed(2),
})