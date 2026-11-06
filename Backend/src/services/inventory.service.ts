import { toProductDto, type ProductDto } from '../mappers/product.mapper.js'
import type { InventoryRepository } from '../repositories/inventory.repository.js'
import type { PaginationMeta } from '../types/http.js'
import { buildPaginationMeta, toSkip } from '../utils/pagination.js'
import type { ListLowStockQuery } from '../validators/inventory.validator.js'

export interface InventoryService {
  listLowStock: (
    query: ListLowStockQuery,
  ) => Promise<{ items: ProductDto[]; meta: PaginationMeta }>
}

export const createInventoryService = ({
  inventoryRepository,
}: {
  inventoryRepository: InventoryRepository
}): InventoryService => ({
  listLowStock: async (query) => {
    const { items, total } = await inventoryRepository.listLowStock({
      skip: toSkip(query.page, query.limit),
      take: query.limit,
    })

    return {
      items: items.map((product) => toProductDto(product, { canViewCostPrice: true })),
      meta: buildPaginationMeta(query.page, query.limit, total),
    }
  },
})