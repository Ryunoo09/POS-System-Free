import { runInTransaction } from '../config/database.js'
import { BusinessRuleError, NotFoundError } from '../errors/app-errors.js'
import { toInventoryProductDto, type InventoryProductDto } from '../mappers/inventory.mapper.js'
import { toProductDto, type ProductDto } from '../mappers/product.mapper.js'
import { toStockMovementDto, type StockMovementDto } from '../mappers/stock-movement.mapper.js'
import type { InventoryRepository } from '../repositories/inventory.repository.js'
import type { ProductRepository } from '../repositories/product.repository.js'
import type { StockMovementRepository } from '../repositories/stock-movement.repository.js'
import type { PaginationMeta } from '../types/http.js'
import { resolveDateRange } from '../utils/date-range.js'
import { buildPaginationMeta, toSkip } from '../utils/pagination.js'
import type {
  AdjustStockInput,
  ListInventoryQuery,
  ListLowStockQuery,
  ListMovementsQuery,
} from '../validators/inventory.validator.js'

export interface InventoryActor {
  id: string
  name: string
  canViewCostPrice: boolean
}

export interface AdjustmentResult {
  movement: StockMovementDto
  product: { id: string; sku: string; stock: number }
}

export interface InventoryService {
  list: (
    query: ListInventoryQuery,
  ) => Promise<{ items: InventoryProductDto[]; meta: PaginationMeta }>
  listLowStock: (
    query: ListLowStockQuery,
    actor: InventoryActor,
  ) => Promise<{ items: ProductDto[]; meta: PaginationMeta }>
  listMovements: (
    query: ListMovementsQuery,
  ) => Promise<{ items: StockMovementDto[]; meta: PaginationMeta }>
  adjust: (input: AdjustStockInput, actor: InventoryActor) => Promise<AdjustmentResult>
}

export const createInventoryService = ({
  inventoryRepository,
  productRepository,
  stockMovementRepository,
}: {
  inventoryRepository: InventoryRepository
  productRepository: ProductRepository
  stockMovementRepository: StockMovementRepository
}): InventoryService => ({
  list: async (query) => {
    const { items, total } = await productRepository.list({
      skip: toSkip(query.page, query.limit),
      take: query.limit,
      search: query.search,
      categoryId: query.category_id,
      isActive: true,
    })

    return {
      items: items.map(toInventoryProductDto),
      meta: buildPaginationMeta(query.page, query.limit, total),
    }
  },

  listLowStock: async (query, actor) => {
    const { items, total } = await inventoryRepository.listLowStock({
      skip: toSkip(query.page, query.limit),
      take: query.limit,
    })

    return {
      items: items.map((product) =>
        toProductDto(product, { canViewCostPrice: actor.canViewCostPrice }),
      ),
      meta: buildPaginationMeta(query.page, query.limit, total),
    }
  },

  listMovements: async (query) => {
    const range =
      query.start_date !== undefined || query.end_date !== undefined
        ? resolveDateRange({ start_date: query.start_date, end_date: query.end_date })
        : null

    const { items, total } = await stockMovementRepository.list({
      skip: toSkip(query.page, query.limit),
      take: query.limit,
      productId: query.product_id,
      movementType: query.movement_type,
      startAt: range?.startAt,
      endAt: range?.endAt,
    })

    return {
      items: items.map(toStockMovementDto),
      meta: buildPaginationMeta(query.page, query.limit, total),
    }
  },

  adjust: async (input, actor) => {
    return runInTransaction(async (tx) => {
      const product = await productRepository.findByIdForUpdate(input.product_id, tx)

      if (!product) {
        throw new NotFoundError('Produk tidak ditemukan', 'NOT_FOUND')
      }

      if (!product.isActive) {
        throw new BusinessRuleError(
          'Produk nonaktif tidak dapat disesuaikan',
          'PRODUCT_INACTIVE',
          [{ field: 'product_id', message: 'Produk nonaktif' }],
        )
      }

      const stockBefore = product.stock
      const stockAfter = stockBefore + input.quantity

      if (stockAfter < 0) {
        throw new BusinessRuleError(
          'Stok tidak boleh negatif',
          'NEGATIVE_STOCK_NOT_ALLOWED',
          [
            {
              field: 'quantity',
              message: `Stok akhir akan menjadi ${stockAfter}`,
            },
          ],
        )
      }

      const updated = await productRepository.updateStock(product.id, stockAfter, tx)
      const movement = await stockMovementRepository.create(
        {
          productId: product.id,
          movementType: input.movement_type,
          quantity: input.quantity,
          stockBefore,
          stockAfter,
          referenceType: 'MANUAL',
          referenceId: null,
          notes: input.notes?.trim() || null,
          createdById: actor.id,
        },
        tx,
      )

      return {
        movement: toStockMovementDto({
          ...movement,
          product: { id: product.id, sku: product.sku, name: product.name },
          createdBy: { id: actor.id, name: actor.name },
          invoiceNumber: null,
        }),
        product: { id: updated.id, sku: updated.sku, stock: updated.stock },
      }
    })
  },
})