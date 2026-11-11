import { Prisma } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProductWithCategory } from '../../src/mappers/product.mapper.js'
import type { InventoryRepository } from '../../src/repositories/inventory.repository.js'
import type { ProductRepository } from '../../src/repositories/product.repository.js'
import type {
  CreateMovementData,
  StockMovementRepository,
  StockMovementView,
} from '../../src/repositories/stock-movement.repository.js'
import {
  createInventoryService,
  type InventoryActor,
} from '../../src/services/inventory.service.js'
import type { AdjustStockInput } from '../../src/validators/inventory.validator.js'

vi.mock('../../src/config/database.js', () => ({
  runInTransaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn({}),
}))

const adminActor: InventoryActor = {
  id: 'admin-1',
  name: 'Admin Uji',
  canViewCostPrice: true,
}

const buildProduct = (
  overrides: Partial<ProductWithCategory> = {},
): ProductWithCategory => ({
  id: 'product-1',
  sku: 'SKU-1',
  barcode: null,
  name: 'Produk Uji',
  description: null,
  categoryId: 'category-1',
  unit: 'pcs',
  costPrice: new Prisma.Decimal('1000.00'),
  sellingPrice: new Prisma.Decimal('1500.00'),
  stock: 10,
  minStock: 5,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  category: { id: 'category-1', name: 'Makanan' },
  ...overrides,
})

const buildProductRepository = (product: ProductWithCategory | null) => {
  const updateStock = vi.fn(async (id: string, stock: number) =>
    buildProduct({ id, stock }),
  )
  const findByIdForUpdate = vi.fn(async () => product)

  const repository: ProductRepository = {
    list: async () => ({ items: [], total: 0 }),
    findById: async () => product,
    findByIdForUpdate,
    findManyByIdsForUpdate: async () => (product ? [product] : []),
    findBySku: async () => null,
    findByBarcode: async () => null,
    findManyByIds: async () => [],
    create: async () => {
      throw new Error('tidak dipakai')
    },
    update: async () => {
      throw new Error('tidak dipakai')
    },
    updateStock,
  }

  return { repository, updateStock, findByIdForUpdate }
}

const buildMovementRepository = () => {
  const create = vi.fn(async (data: CreateMovementData): Promise<StockMovementView> => ({
    id: 'movement-1',
    productId: data.productId,
    movementType: data.movementType,
    quantity: data.quantity,
    stockBefore: data.stockBefore,
    stockAfter: data.stockAfter,
    referenceType: data.referenceType,
    referenceId: data.referenceId,
    notes: data.notes,
    createdById: data.createdById,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    product: { id: 'product-1', sku: 'SKU-1', name: 'Produk Uji' },
    createdBy: { id: 'admin-1', name: 'Admin Uji' },
    invoiceNumber: null,
  }))

  const repository: StockMovementRepository = {
    create,
    list: async () => ({ items: [], total: 0 }),
  }

  return { repository, create }
}

const buildInventoryRepository = (): InventoryRepository => ({
  listLowStock: async () => ({ items: [], total: 0 }),
})

const buildService = (product: ProductWithCategory | null = buildProduct()) => {
  const products = buildProductRepository(product)
  const movements = buildMovementRepository()

  return {
    service: createInventoryService({
      inventoryRepository: buildInventoryRepository(),
      productRepository: products.repository,
      stockMovementRepository: movements.repository,
    }),
    updateStock: products.updateStock,
    createMovement: movements.create,
  }
}

const purchaseInput = (overrides: Partial<AdjustStockInput> = {}): AdjustStockInput => ({
  product_id: 'product-1',
  movement_type: 'PURCHASE',
  quantity: 20,
  ...overrides,
})

describe('InventoryService.adjust', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('menambah stok untuk PURCHASE dan mencatat movement', async () => {
    const { service, updateStock, createMovement } = buildService()

    const result = await service.adjust(purchaseInput(), adminActor)

    expect(updateStock).toHaveBeenCalledWith('product-1', 30, expect.anything())
    expect(createMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        movementType: 'PURCHASE',
        quantity: 20,
        stockBefore: 10,
        stockAfter: 30,
        referenceType: 'MANUAL',
        referenceId: null,
        createdById: 'admin-1',
      }),
      expect.anything(),
    )
    expect(result.product).toEqual({ id: 'product-1', sku: 'SKU-1', stock: 30 })
    expect(result.movement.stock_after).toBe(30)
  })

  it('mengurangi stok untuk ADJUSTMENT negatif dengan alasan', async () => {
    const { service, updateStock, createMovement } = buildService()

    const result = await service.adjust(
      {
        product_id: 'product-1',
        movement_type: 'ADJUSTMENT',
        quantity: -5,
        notes: 'Barang rusak',
      },
      adminActor,
    )

    expect(updateStock).toHaveBeenCalledWith('product-1', 5, expect.anything())
    expect(createMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        movementType: 'ADJUSTMENT',
        quantity: -5,
        stockBefore: 10,
        stockAfter: 5,
        notes: 'Barang rusak',
      }),
      expect.anything(),
    )
    expect(result.product.stock).toBe(5)
  })

  it('menolak adjustment yang membuat stok negatif tanpa mengubah data', async () => {
    const { service, updateStock, createMovement } = buildService()

    await expect(
      service.adjust(
        {
          product_id: 'product-1',
          movement_type: 'ADJUSTMENT',
          quantity: -11,
          notes: 'Koreksi',
        },
        adminActor,
      ),
    ).rejects.toMatchObject({ code: 'NEGATIVE_STOCK_NOT_ALLOWED', statusCode: 422 })

    expect(updateStock).not.toHaveBeenCalled()
    expect(createMovement).not.toHaveBeenCalled()
  })

  it('menolak produk yang tidak ditemukan', async () => {
    const { service } = buildService(null)

    await expect(service.adjust(purchaseInput(), adminActor)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      statusCode: 404,
    })
  })

  it('menolak produk nonaktif', async () => {
    const { service, updateStock } = buildService(buildProduct({ isActive: false }))

    await expect(service.adjust(purchaseInput(), adminActor)).rejects.toMatchObject({
      code: 'PRODUCT_INACTIVE',
      statusCode: 422,
    })

    expect(updateStock).not.toHaveBeenCalled()
  })
})

describe('InventoryService.list', () => {
  it('menghitung stock_value dari stok dan harga modal', async () => {
    const products = buildProductRepository(buildProduct())
    const service = createInventoryService({
      inventoryRepository: buildInventoryRepository(),
      productRepository: {
        ...products.repository,
        list: async () => ({ items: [buildProduct()], total: 1 }),
      },
      stockMovementRepository: buildMovementRepository().repository,
    })

    const result = await service.list({ page: 1, limit: 10 })

    expect(result.items[0]).toMatchObject({
      sku: 'SKU-1',
      stock: 10,
      cost_price: '1000.00',
      stock_value: '10000.00',
    })
    expect(result.meta).toEqual({ page: 1, limit: 10, total_items: 1, total_pages: 1 })
  })
})