import { PrismaClient } from '@prisma/client'
import { Redis } from 'ioredis'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { createCacheService, type CacheService } from '../../src/cache/cache.service.js'
import { env } from '../../src/config/env.js'
import type { RedisClient } from '../../src/config/redis.js'
import { createProductRepository } from '../../src/repositories/product.repository.js'
import type { CategoryRepository } from '../../src/repositories/category.repository.js'
import type { StockMovementRepository } from '../../src/repositories/stock-movement.repository.js'
import { createProductService, type ProductActor, type ProductService } from '../../src/services/product.service.js'
import type { PriceService } from '../../src/services/price.service.js'

/**
 * Integration test dengan Redis nyata. Dilewati otomatis kecuali `REDIS_TEST_URL`
 * diberikan, contoh:
 *
 *   $env:REDIS_TEST_URL='redis://127.0.0.1:6379'; pnpm --dir Backend test cache.integration
 */
const REDIS_TEST_URL = process.env.REDIS_TEST_URL

const actor: ProductActor = { id: 'tester-1', canViewCostPrice: true, isCashier: false }

describe.skipIf(!REDIS_TEST_URL)('cache dengan Redis nyata', () => {
  let redis: Redis
  let prisma: PrismaClient
  let cache: CacheService
  let service: ProductService
  let productId: string | null = null
  let createdCategoryId: string | null = null
  let queryCount = 0

  beforeAll(async () => {
    redis = new Redis(REDIS_TEST_URL!)
    await redis.ping()

    const stale = await redis.keys(`${env.REDIS_KEY_PREFIX}*`)
    if (stale.length > 0) await redis.del(...stale)

    cache = createCacheService(redis as unknown as RedisClient)

    prisma = new PrismaClient({ log: [{ emit: 'event', level: 'query' }] })
    ;(prisma as unknown as { $on: (event: string, listener: () => void) => void }).$on(
      'query',
      () => {
        queryCount += 1
      },
    )

    const row = await prisma.category.create({ data: { name: `Cache ${Date.now()}` } })
    const product = await prisma.product.create({
      data: {
        sku: `CACHE-${Date.now()}`,
        name: 'Produk Cache',
        categoryId: row.id,
        unit: 'pcs',
        costPrice: '1000.00',
        averageCost: '1000.00',
        sellingPrice: '1500.00',
        stock: 5,
        minStock: 1,
        isActive: true,
      },
      select: { id: true },
    })
    productId = product.id
    createdCategoryId = row.id

    service = createProductService({
      productRepository: createProductRepository(prisma),
      categoryRepository: {} as unknown as CategoryRepository,
      stockMovementRepository: {} as unknown as StockMovementRepository,
      priceService: {
        applyDueScheduledPrices: async () => 0,
        recordPriceChanges: async () => undefined,
      } as unknown as PriceService,
      cache,
    })
  })

  afterAll(async () => {
    if (productId) await prisma.product.deleteMany({ where: { id: productId } })
    if (createdCategoryId) await prisma.category.deleteMany({ where: { id: createdCategoryId } })
    await prisma?.$disconnect()
    redis?.disconnect()
  })

  it('hit kedua tidak menambah query Prisma', async (ctx) => {
    if (!productId) return ctx.skip()

    await service.getById(productId, actor)

    queryCount = 0
    const cached = await service.getById(productId, actor)

    expect(queryCount).toBe(0)
    expect(cached.id).toBe(productId)
  })

  it('bumpVersion memaksa query ulang', async (ctx) => {
    if (!productId) return ctx.skip()

    await service.getById(productId, actor)
    await cache.bumpVersion('products')

    queryCount = 0
    await service.getById(productId, actor)

    expect(queryCount).toBeGreaterThan(0)
  })

  it('hasil null tetap ter-cache (bukan miss berulang)', async () => {
    const loader = vi.fn(async () => null)

    await cache.getOrSet(`${env.REDIS_KEY_PREFIX}:test:null`, 60, loader)
    const second = await cache.getOrSet(`${env.REDIS_KEY_PREFIX}:test:null`, 60, loader)

    expect(second).toBeNull()
    expect(loader).toHaveBeenCalledTimes(1)
  })
})
