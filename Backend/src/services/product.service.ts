import { runInTransaction } from '../config/database.js'
import { BusinessRuleError, ConflictError, NotFoundError } from '../errors/app-errors.js'
import { toProductDto, type ProductDto } from '../mappers/product.mapper.js'
import type { CategoryRepository } from '../repositories/category.repository.js'
import type { ProductRepository, UpdateProductData } from '../repositories/product.repository.js'
import type { StockMovementRepository } from '../repositories/stock-movement.repository.js'
import type { AuditRecorder } from './audit.service.js'
import type { PriceService } from './price.service.js'
import type { PaginationMeta } from '../types/http.js'
import { buildFieldDiff } from '../utils/audit-diff.js'
import { generateInternalEan13 } from '../utils/barcode.js'
import { buildPaginationMeta, toSkip } from '../utils/pagination.js'
import type {
  CreateProductInput,
  ListProductsQuery,
  UpdateProductInput,
} from '../validators/product.validator.js'

export interface ProductActor {
  id: string
  canViewCostPrice: boolean
  /** Cashier selalu dipaksa melihat produk aktif saja. */
  isCashier: boolean
  ipAddress?: string | null
  userAgent?: string | null
}

export interface ProductService {
  list: (
    query: ListProductsQuery,
    actor: ProductActor,
  ) => Promise<{ items: ProductDto[]; meta: PaginationMeta }>
  getById: (id: string, actor: ProductActor) => Promise<ProductDto>
  create: (input: CreateProductInput, actor: ProductActor) => Promise<ProductDto>
  update: (id: string, input: UpdateProductInput, actor: ProductActor) => Promise<ProductDto>
  deactivate: (id: string, actor: ProductActor) => Promise<ProductDto>
  generateBarcode: (
    id: string,
    actor: ProductActor,
  ) => Promise<{ id: string; barcode: string }>
}

const MAX_BARCODE_ATTEMPTS = 5

export const createProductService = ({
  productRepository,
  categoryRepository,
  stockMovementRepository,
  audit,
  priceService,
}: {
  productRepository: ProductRepository
  categoryRepository: CategoryRepository
  stockMovementRepository: StockMovementRepository
  audit?: AuditRecorder
  priceService: PriceService
}): ProductService => {
  const assertCategoryActive = async (categoryId: string): Promise<void> => {
    const category = await categoryRepository.findById(categoryId)

    if (!category) {
      throw new NotFoundError('Kategori tidak ditemukan', 'NOT_FOUND')
    }

    if (!category.isActive) {
      throw new BusinessRuleError(
        'Kategori nonaktif tidak dapat dipilih',
        'CATEGORY_INACTIVE',
        [{ field: 'category_id', message: 'Kategori nonaktif' }],
      )
    }
  }

  const assertSkuAvailable = async (sku: string, excludeId?: string): Promise<void> => {
    const existing = await productRepository.findBySku(sku)

    if (existing && existing.id !== excludeId) {
      throw new ConflictError('SKU sudah digunakan', 'DUPLICATE_SKU', [
        { field: 'sku', message: 'SKU sudah digunakan' },
      ])
    }
  }

  const assertBarcodeAvailable = async (
    barcode: string,
    excludeId?: string,
  ): Promise<void> => {
    const existing = await productRepository.findByBarcode(barcode)

    if (existing && existing.id !== excludeId) {
      throw new ConflictError('Barcode sudah digunakan', 'DUPLICATE_BARCODE', [
        { field: 'barcode', message: 'Barcode sudah digunakan' },
      ])
    }
  }

  return {
    list: async (query, actor) => {
      const canViewCostPrice = actor.canViewCostPrice
      const isActive = actor.isCashier ? true : query.is_active

      await priceService.applyDueScheduledPrices()

      const { items, total } = await productRepository.list({
        skip: toSkip(query.page, query.limit),
        take: query.limit,
        search: query.search,
        barcode: query.barcode,
        categoryId: query.category_id,
        isActive,
      })

      return {
        items: items.map((product) => toProductDto(product, { canViewCostPrice })),
        meta: buildPaginationMeta(query.page, query.limit, total),
      }
    },

    getById: async (id, actor) => {
      await priceService.applyDueScheduledPrices(undefined, [id])

      const product = await productRepository.findById(id)

      if (!product) {
        throw new NotFoundError('Produk tidak ditemukan', 'NOT_FOUND')
      }

      return toProductDto(product, { canViewCostPrice: actor.canViewCostPrice })
    },

    create: async (input, actor) => {
      await assertSkuAvailable(input.sku)

      if (input.barcode) {
        await assertBarcodeAvailable(input.barcode)
      }

      await assertCategoryActive(input.category_id)

      const created = await runInTransaction(async (tx) => {
        const product = await productRepository.create(
          {
            sku: input.sku,
            barcode: input.barcode ?? null,
            name: input.name,
            description: input.description ?? null,
            categoryId: input.category_id,
            unit: input.unit,
            costPrice: input.cost_price.toFixed(2),
            sellingPrice: input.selling_price.toFixed(2),
            stock: input.stock,
            minStock: input.min_stock,
          },
          tx,
        )

        if (input.stock > 0) {
          await stockMovementRepository.create(
            {
              productId: product.id,
              movementType: 'INITIAL_STOCK',
              quantity: input.stock,
              stockBefore: 0,
              stockAfter: input.stock,
              referenceType: 'MANUAL',
              referenceId: null,
              notes: 'Stok awal produk',
              createdById: actor.id,
            },
            tx,
          )
        }

        return product
      })

      return toProductDto(created, { canViewCostPrice: actor.canViewCostPrice })
    },

    update: async (id, input, actor) => {
      const existing = await productRepository.findById(id)

      if (!existing) {
        throw new NotFoundError('Produk tidak ditemukan', 'NOT_FOUND')
      }

      if (input.sku !== undefined) {
        await assertSkuAvailable(input.sku, id)
      }

      if (input.barcode !== undefined) {
        await assertBarcodeAvailable(input.barcode, id)
      }

      if (input.category_id !== undefined) {
        await assertCategoryActive(input.category_id)
      }

      const data: UpdateProductData = {}

      if (input.sku !== undefined) data.sku = input.sku
      if (input.barcode !== undefined) data.barcode = input.barcode
      if (input.name !== undefined) data.name = input.name
      if (input.description !== undefined) data.description = input.description
      if (input.category_id !== undefined) data.categoryId = input.category_id
      if (input.unit !== undefined) data.unit = input.unit
      if (input.cost_price !== undefined) data.costPrice = input.cost_price.toFixed(2)
      if (input.selling_price !== undefined) data.sellingPrice = input.selling_price.toFixed(2)
      if (input.min_stock !== undefined) data.minStock = input.min_stock
      if (input.is_active !== undefined) data.isActive = input.is_active

      const updated = await runInTransaction(async (tx) => {
        const result = await productRepository.update(id, data, tx)

        await priceService.recordPriceChanges({
          productId: id,
          before: {
            sellingPrice: existing.sellingPrice.toFixed(2),
            costPrice: existing.costPrice.toFixed(2),
          },
          after: {
            sellingPrice: result.sellingPrice.toFixed(2),
            costPrice: result.costPrice.toFixed(2),
          },
          source: 'MANUAL',
          reason: null,
          changedById: actor.id,
          tx,
        })

        return result
      })

      const diff = buildFieldDiff(
        {
          name: existing.name,
          category_id: existing.categoryId,
          unit: existing.unit,
          cost_price: existing.costPrice.toFixed(2),
          selling_price: existing.sellingPrice.toFixed(2),
          min_stock: existing.minStock,
          is_active: existing.isActive,
        },
        {
          name: updated.name,
          category_id: updated.categoryId,
          unit: updated.unit,
          cost_price: updated.costPrice.toFixed(2),
          selling_price: updated.sellingPrice.toFixed(2),
          min_stock: updated.minStock,
          is_active: updated.isActive,
        },
      )

      if (diff) {
        await audit?.record({
          userId: actor.id,
          action: 'UPDATE',
          entity: 'PRODUCT',
          entityId: id,
          oldValue: diff.oldValue,
          newValue: diff.newValue,
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        })
      }

      return toProductDto(updated, { canViewCostPrice: actor.canViewCostPrice })
    },

    deactivate: async (id, actor) => {
      const existing = await productRepository.findById(id)

      if (!existing) {
        throw new NotFoundError('Produk tidak ditemukan', 'NOT_FOUND')
      }

      const updated = await productRepository.update(id, { isActive: false })

      return toProductDto(updated, { canViewCostPrice: actor.canViewCostPrice })
    },

    generateBarcode: async (id, actor) => {
      const existing = await productRepository.findById(id)

      if (!existing) {
        throw new NotFoundError('Produk tidak ditemukan', 'NOT_FOUND')
      }

      if (existing.barcode) {
        throw new ConflictError('Produk sudah memiliki barcode', 'BARCODE_ALREADY_EXISTS', [
          { field: 'barcode', message: 'Produk sudah memiliki barcode' },
        ])
      }

      for (let attempt = 0; attempt < MAX_BARCODE_ATTEMPTS; attempt += 1) {
        const candidate = generateInternalEan13()

        if (await productRepository.findByBarcode(candidate)) continue

        await productRepository.update(id, { barcode: candidate })
        await audit?.record({
          userId: actor.id,
          action: 'UPDATE',
          entity: 'PRODUCT',
          entityId: id,
          oldValue: { barcode: null },
          newValue: { barcode: candidate },
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        })

        return { id, barcode: candidate }
      }

      throw new ConflictError(
        'Gagal menghasilkan barcode unik, coba lagi',
        'BARCODE_COLLISION',
      )
    },
  }
}
