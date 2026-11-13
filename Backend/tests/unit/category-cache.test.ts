import { describe, expect, it, vi } from 'vitest'
import { createCacheService } from '../../src/cache/cache.service.js'
import type { CategoryRepository } from '../../src/repositories/category.repository.js'
import type { ListCategoriesQuery } from '../../src/validators/category.validator.js'
import { createCategoryService } from '../../src/services/category.service.js'
import { asRedisClient, createFakeRedis } from '../helpers/fake-redis.js'

const buildCategory = (id: string, name: string) => ({
  id,
  name,
  description: null,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  _count: { products: 0 },
})

const buildService = () => {
  const list = vi.fn(async () => ({ items: [buildCategory('c1', 'Makanan')], total: 1 }))
  const categoryRepository = { list } as unknown as CategoryRepository
  const client = createFakeRedis()
  const cache = createCacheService(asRedisClient(client))

  return { service: createCategoryService({ categoryRepository, cache }), list, cache }
}

const query: ListCategoriesQuery = { page: 1, limit: 10 }

describe('CategoryService.list dengan cache', () => {
  it('request kedua dilayani cache (tanpa query database)', async () => {
    const { service, list } = buildService()

    const first = await service.list(query, { canViewAll: true })
    const second = await service.list(query, { canViewAll: true })

    expect(list).toHaveBeenCalledTimes(1)
    expect(second).toEqual(first)
  })

  it('scope role berbeda memakai key berbeda', async () => {
    const { service, list } = buildService()

    await service.list(query, { canViewAll: true })
    await service.list(query, { canViewAll: false })

    expect(list).toHaveBeenCalledTimes(2)
  })

  it('bumpVersion categories membuat data diambil ulang dari database', async () => {
    const { service, list, cache } = buildService()

    await service.list(query, { canViewAll: true })
    await cache.bumpVersion('categories')
    await service.list(query, { canViewAll: true })

    expect(list).toHaveBeenCalledTimes(2)
  })
})