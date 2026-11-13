import { describe, expect, it, vi } from 'vitest'
import { createCacheService } from '../../src/cache/cache.service.js'
import type { ReportRepository } from '../../src/repositories/report.repository.js'
import { createDashboardService } from '../../src/services/dashboard.service.js'
import { asRedisClient, createFakeRedis } from '../helpers/fake-redis.js'

const pastRange = { start_date: '2020-01-01', end_date: '2020-01-07' }

const buildService = () => {
  const getSummary = vi.fn(async () => ({
    revenue: '100000.00',
    cogs: '60000.00',
    grossProfit: '40000.00',
    transactionCount: 4,
    totalProducts: 10,
    totalStock: 50,
    lowStockCount: 2,
  }))
  const getDailySales = vi.fn(async () => [
    { date: '2020-01-01', revenue: '100000.00', transactionCount: 4 },
  ])
  const getTopProducts = vi.fn(async () => [
    { productId: 'p1', sku: 'SKU-1', name: 'Produk', quantitySold: 3, revenue: '9000.00' },
  ])
  const getPaymentMethodSales = vi.fn(async () => [
    { paymentMethod: 'CASH', transactionCount: 4, revenue: '100000.00' },
  ])
  const getCategorySales = vi.fn(async () => [
    { categoryId: 'c1', category: 'Makanan', quantitySold: 3, revenue: '9000.00' },
  ])

  const reportRepository = {
    getSummary,
    getDailySales,
    getTopProducts,
    getPaymentMethodSales,
    getCategorySales,
  } as unknown as ReportRepository

  const client = createFakeRedis()
  const cache = createCacheService(asRedisClient(client))

  return {
    service: createDashboardService({ reportRepository, cache }),
    spies: { getSummary, getDailySales, getTopProducts, getPaymentMethodSales, getCategorySales },
    client,
  }
}

describe('DashboardService dengan cache', () => {
  it('summary kedua tidak menambah query agregasi', async () => {
    const { service, spies } = buildService()

    const first = await service.getSummary(pastRange)
    const second = await service.getSummary(pastRange)

    // Panggilan pertama: periode kini + periode pembanding.
    expect(spies.getSummary).toHaveBeenCalledTimes(2)
    expect(second).toEqual(first)
  })

  it('sales, top products, dan breakdown memakai cache', async () => {
    const { service, spies } = buildService()

    await service.getSales(pastRange)
    await service.getSales(pastRange)
    await service.getTopProducts(pastRange, 5)
    await service.getTopProducts(pastRange, 5)
    await service.getBreakdown(pastRange)
    await service.getBreakdown(pastRange)

    expect(spies.getDailySales).toHaveBeenCalledTimes(1)
    expect(spies.getTopProducts).toHaveBeenCalledTimes(1)
    expect(spies.getPaymentMethodSales).toHaveBeenCalledTimes(1)
    expect(spies.getCategorySales).toHaveBeenCalledTimes(1)
  })

  it('limit berbeda memakai key berbeda', async () => {
    const { service, spies } = buildService()

    await service.getTopProducts(pastRange, 5)
    await service.getTopProducts(pastRange, 10)

    expect(spies.getTopProducts).toHaveBeenCalledTimes(2)
  })

  it('rentang lampau memakai TTL lebih panjang daripada rentang berjalan', async () => {
    const past = buildService()
    await past.service.getSummary(pastRange)
    const pastTtl = past.client.ttls[0] ?? 0

    const current = buildService()
    await current.service.getSummary({})
    const currentTtl = current.client.ttls[0] ?? 0

    expect(pastTtl).toBeGreaterThan(currentTtl)
    expect(currentTtl).toBeGreaterThanOrEqual(54)
    expect(currentTtl).toBeLessThanOrEqual(66)
    expect(pastTtl).toBeGreaterThanOrEqual(810)
    expect(pastTtl).toBeLessThanOrEqual(990)
  })
})