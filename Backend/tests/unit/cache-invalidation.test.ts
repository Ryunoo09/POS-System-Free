import { Prisma } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const hoisted = vi.hoisted(() => ({ events: [] as string[] }))

vi.mock('../../src/config/database.js', () => ({
  runInTransaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
    const result = await fn({})
    hoisted.events.push('commit')
    return result
  },
}))

const { createCacheService } = await import('../../src/cache/cache.service.js')
const { createCategoryService } = await import('../../src/services/category.service.js')
const { createPriceService } = await import('../../src/services/price.service.js')
const { createProductService } = await import('../../src/services/product.service.js')

import type { CacheService } from '../../src/cache/cache.service.js'
import type { CategoryRepository } from '../../src/repositories/category.repository.js'
import type { PriceRepository, PriceTx } from '../../src/repositories/price.repository.js'
import type { ProductRepository } from '../../src/repositories/product.repository.js'
import type { StockMovementRepository } from '../../src/repositories/stock-movement.repository.js'
import type { PriceService } from '../../src/services/price.service.js'
import type { ProductActor } from '../../src/services/product.service.js'

const adminActor: ProductActor = { id: 'admin-1', canViewCostPrice: true, isCashier: false }

const buildProduct = (overrides: Partial<Prisma.ProductGetPayload<{ include: { category: true } }>> = {}) => ({
  id: 'product-1',
  sku: 'SKU-1',
  barcode: null,
  name: 'Produk Uji',
  description: null,
  categoryId: 'category-1',
  unit: 'pcs',
  costPrice: new Prisma.Decimal('1000.00'),
  averageCost: new Prisma.Decimal('1000.00'),
  sellingPrice: new Prisma.Decimal('1500.00'),
  stock: 5,
  minStock: 2,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  category: { id: 'category-1', name: 'Makanan', description: null, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  ...overrides,
})

const buildCache = (): CacheService => {
  const bumpVersion = vi.fn(async (namespace: string) => {
    hoisted.events.push(`bump:${namespace}`)
  })

  return { bumpVersion } as unknown as CacheService
}

const buildProductRepository = (overrides: Partial<ProductRepository> = {}): ProductRepository =>
  ({
    list: async () => ({ items: [], total: 0 }),
    findById: async () => buildProduct(),
    findByIdForUpdate: async () => buildProduct(),
    findManyByIdsForUpdate: async () => [],
    findBySku: async () => null,
    findByBarcode: async () => null,
    findManyByIds: async () => [],
    create: async () => buildProduct(),
    update: async () => buildProduct(),
    updateStock: async () => buildProduct(),
    ...overrides,
  }) as unknown as ProductRepository

const buildCategoryRepository = (overrides: Partial<CategoryRepository> = {}): CategoryRepository =>
  ({
    findById: async () => ({
      id: 'category-1',
      name: 'Makanan',
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    findByName: async () => null,
    list: async () => ({ items: [], total: 0 }),
    countProducts: async () => 0,
    create: async () => ({
      id: 'category-2',
      name: 'Minuman',
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { products: 0 },
    }),
    update: async () => ({
      id: 'category-1',
      name: 'Makanan Ringan',
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { products: 0 },
    }),
    delete: async () => ({
      id: 'category-1',
      name: 'Makanan',
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { products: 0 },
    }),
    ...overrides,
  }) as unknown as CategoryRepository

const buildPriceRepository = (overrides: Partial<PriceRepository> = {}): PriceRepository =>
  ({
    findDueSchedules: async () => [
      {
        id: 'schedule-1',
        productId: 'product-1',
        sellingPrice: new Prisma.Decimal('2000.00'),
        reason: 'penyesuaian',
        createdById: 'admin-1',
      },
    ],
    claimSchedule: async () => 1,
    createHistory: async () => undefined,
    listHistory: async () => [],
    listCostHistory: async () => [],
    cancelActiveSchedules: async () => undefined,
    createSchedule: async () => {
      throw new Error('tidak dipakai')
    },
    findActiveSchedule: async () => null,
    cancelSchedule: async () => 0,
    ...overrides,
  }) as unknown as PriceRepository

const buildPriceServiceStub = (): PriceService =>
  ({
    applyDueScheduledPrices: async () => 0,
    recordPriceChanges: async () => undefined,
  }) as unknown as PriceService

beforeEach(() => {
  hoisted.events.length = 0
})

describe('invalidasi cache produk & kategori', () => {
  it('product update menaikkan versi products setelah transaksi commit', async () => {
    const service = createProductService({
      productRepository: buildProductRepository(),
      categoryRepository: buildCategoryRepository(),
      stockMovementRepository: {} as StockMovementRepository,
      priceService: buildPriceServiceStub(),
      cache: buildCache(),
    })

    await service.update('product-1', { name: 'Produk Baru' }, adminActor)

    expect(hoisted.events).toEqual(['commit', 'bump:products'])
  })

  it('product create dan deactivate menginvalidasi cache produk', async () => {
    const service = createProductService({
      productRepository: buildProductRepository(),
      categoryRepository: buildCategoryRepository(),
      stockMovementRepository: {} as StockMovementRepository,
      priceService: buildPriceServiceStub(),
      cache: buildCache(),
    })

    await service.create(
      {
        sku: 'SKU-9',
        name: 'Produk Baru',
        category_id: 'category-1',
        unit: 'pcs',
        cost_price: 1000,
        selling_price: 1500,
        stock: 0,
        min_stock: 0,
      },
      adminActor,
    )
    await service.deactivate('product-1', adminActor)

    expect(hoisted.events).toEqual(['commit', 'bump:products', 'bump:products'])
  })

  it('category create hanya menginvalidasi categories, update juga products', async () => {
    const service = createCategoryService({
      categoryRepository: buildCategoryRepository(),
      cache: buildCache(),
    })

    await service.create({ name: 'Minuman' })
    await service.update('category-1', { name: 'Makanan Ringan' })

    expect(hoisted.events).toEqual([
      'bump:categories',
      'bump:categories',
      'bump:products',
    ])
  })
})

describe('invalidasi cache dari perubahan harga', () => {
  it('applyDueScheduledPrices tanpa tx menaikkan versi products setelah commit', async () => {
    const service = createPriceService({
      priceRepository: buildPriceRepository(),
      productRepository: buildProductRepository(),
      cache: buildCache(),
    })

    await expect(service.applyDueScheduledPrices()).resolves.toBe(1)
    expect(hoisted.events).toEqual(['commit', 'bump:products'])
  })

  it('applyDueScheduledPrices dengan tx tidak invalidasi (pemanggil yang urus)', async () => {
    const service = createPriceService({
      priceRepository: buildPriceRepository(),
      productRepository: buildProductRepository(),
      cache: buildCache(),
    })

    await expect(service.applyDueScheduledPrices({} as PriceTx, ['product-1'])).resolves.toBe(1)
    expect(hoisted.events).toEqual([])
  })

  it('bulkApply menaikkan versi products saat ada harga berubah', async () => {
    const service = createPriceService({
      priceRepository: buildPriceRepository(),
      productRepository: buildProductRepository({
        findManyByIds: async () => [buildProduct()],
        findManyByIdsForUpdate: async () => [buildProduct()],
      }),
      cache: buildCache(),
    })

    await service.bulkApply({ mode: 'PERCENT', value: 10, product_ids: ['product-1'], reason: 'naik' }, {
      id: 'admin-1',
      canViewCostPrice: true,
    })

    expect(hoisted.events).toEqual(['commit', 'bump:products'])
  })
})

describe('CacheService tanpa Redis tidak pernah menaikkan versi', () => {
  it('bumpVersion aman dipanggil tanpa koneksi', async () => {
    const service = createCacheService(null)

    await expect(service.bumpVersion('products')).resolves.toBeUndefined()
  })
})
