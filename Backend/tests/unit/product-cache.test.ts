import { Prisma } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import { createCacheService } from '../../src/cache/cache.service.js'
import type { CategoryRepository } from '../../src/repositories/category.repository.js'
import type { ProductRepository } from '../../src/repositories/product.repository.js'
import type { StockMovementRepository } from '../../src/repositories/stock-movement.repository.js'
import { createProductService, type ProductActor } from '../../src/services/product.service.js'
import type { PriceService } from '../../src/services/price.service.js'
import type { ListProductsQuery } from '../../src/validators/product.validator.js'
import { asRedisClient, createFakeRedis } from '../helpers/fake-redis.js'

const adminActor: ProductActor = { id: 'admin-1', canViewCostPrice: true, isCashier: false }
const cashierActor: ProductActor = { id: 'cashier-1', canViewCostPrice: false, isCashier: true }

const buildProduct = () => ({
  id: 'product-1',
  sku: 'SKU-1',
  barcode: '8991234567890',
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
  category: { id: 'category-1', name: 'Makanan' },
})

const buildService = () => {
  const findById = vi.fn(async () => buildProduct())
  const list = vi.fn(async () => ({ items: [buildProduct()], total: 1 }))
  const productRepository = { findById, list } as unknown as ProductRepository
  const priceService = {
    applyDueScheduledPrices: async () => 0,
  } as unknown as PriceService
  const client = createFakeRedis()
  const cache = createCacheService(asRedisClient(client))

  const service = createProductService({
    productRepository,
    categoryRepository: {} as CategoryRepository,
    stockMovementRepository: {} as StockMovementRepository,
    priceService,
    cache,
  })

  return { service, findById, list, cache }
}

describe('ProductService.getById dengan cache', () => {
  it('request kedua dilayani cache', async () => {
    const { service, findById } = buildService()

    const first = await service.getById('product-1', adminActor)
    const second = await service.getById('product-1', adminActor)

    expect(findById).toHaveBeenCalledTimes(1)
    expect(second).toEqual(first)
  })

  it('admin dan cashier memakai key terpisah (harga modal tidak bocor)', async () => {
    const { service, findById } = buildService()

    const adminView = await service.getById('product-1', adminActor)
    const cashierView = await service.getById('product-1', cashierActor)

    expect(findById).toHaveBeenCalledTimes(2)
    expect(adminView.cost_price).toBe('1000.00')
    expect(cashierView.cost_price).toBeUndefined()
  })

  it('bumpVersion products memaksa baca ulang dari database', async () => {
    const { service, findById, cache } = buildService()

    await service.getById('product-1', adminActor)
    await cache.bumpVersion('products')
    await service.getById('product-1', adminActor)

    expect(findById).toHaveBeenCalledTimes(2)
  })

  it('produk tidak ditemukan tidak disimpan ke cache', async () => {
    const { service, findById } = buildService()
    findById.mockResolvedValueOnce(null as never)

    await expect(service.getById('product-x', adminActor)).rejects.toThrow('Produk tidak ditemukan')
    await service.getById('product-1', adminActor)

    expect(findById).toHaveBeenCalledTimes(2)
  })
})

describe('ProductService.list dengan cache', () => {
  const barcodeQuery: ListProductsQuery = { page: 1, limit: 1, barcode: '8991234567890' }
  const searchQuery: ListProductsQuery = { page: 1, limit: 10, search: 'indomie' }

  it('lookup barcode kedua dilayani cache', async () => {
    const { service, list } = buildService()

    const first = await service.list(barcodeQuery, cashierActor)
    const second = await service.list(barcodeQuery, cashierActor)

    expect(list).toHaveBeenCalledTimes(1)
    expect(second).toEqual(first)
  })

  it('pencarian bebas tidak di-cache', async () => {
    const { service, list } = buildService()

    await service.list(searchQuery, adminActor)
    await service.list(searchQuery, adminActor)

    expect(list).toHaveBeenCalledTimes(2)
  })

  it('scope cashier dan admin terpisah untuk barcode yang sama', async () => {
    const { service, list } = buildService()

    await service.list(barcodeQuery, cashierActor)
    await service.list(barcodeQuery, adminActor)

    expect(list).toHaveBeenCalledTimes(2)
  })
})