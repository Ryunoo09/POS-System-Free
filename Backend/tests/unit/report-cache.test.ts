import { describe, expect, it, vi } from 'vitest'
import { createCacheService } from '../../src/cache/cache.service.js'
import type { ReportRepository } from '../../src/repositories/report.repository.js'
import { createReportService } from '../../src/services/report.service.js'
import { todayInJakarta } from '../../src/utils/date-range.js'
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
  const getPeriodSales = vi.fn(async () => [
    { period: '2020-01-01', revenue: '100000.00', cogs: '60000.00', grossProfit: '40000.00', transactionCount: 4 },
  ])
  const listProductSales = vi.fn(async () => ({
    items: [
      {
        productId: 'p1',
        sku: 'SKU-1',
        name: 'Produk',
        category: 'Makanan',
        quantitySold: 3,
        revenue: '9000.00',
        cogs: '6000.00',
        grossProfit: '3000.00',
      },
    ],
    total: 1,
  }))
  const listCashierSales = vi.fn(async () => [
    {
      cashierId: 'u1',
      cashierName: 'Kasir',
      transactionCount: 4,
      revenue: '100000.00',
      grossProfit: '40000.00',
      averageTransaction: '25000.00',
    },
  ])
  const getCategoryCogs = vi.fn(async () => [
    {
      categoryId: 'c1',
      category: 'Makanan',
      quantitySold: 3,
      revenue: '9000.00',
      cogs: '6000.00',
      grossProfit: '3000.00',
    },
  ])
  const getInventoryValuation = vi.fn(async () => ({
    totalValue: '500000.00',
    totalQuantity: 50,
    items: [
      {
        productId: 'p1',
        sku: 'SKU-1',
        name: 'Produk',
        category: 'Makanan',
        stock: 5,
        averageCost: '1000.00',
        inventoryValue: '5000.00',
      },
    ],
    byCategory: [{ categoryId: 'c1', category: 'Makanan', quantity: 5, value: '5000.00' }],
  }))

  const reportRepository = {
    getSummary,
    getPeriodSales,
    listProductSales,
    listCashierSales,
    getCategoryCogs,
    getInventoryValuation,
  } as unknown as ReportRepository

  const client = createFakeRedis()
  const cache = createCacheService(asRedisClient(client))

  return {
    service: createReportService({ reportRepository, cache }),
    spies: {
      getSummary,
      getPeriodSales,
      listProductSales,
      listCashierSales,
      getCategoryCogs,
      getInventoryValuation,
    },
    client,
    cache,
  }
}

describe('ReportService dengan cache', () => {
  it('sales report kedua tidak menambah query agregasi', async () => {
    const { service, spies } = buildService()

    const first = await service.getSales({ ...pastRange, group_by: 'daily' })
    const second = await service.getSales({ ...pastRange, group_by: 'daily' })

    expect(spies.getSummary).toHaveBeenCalledTimes(1)
    expect(spies.getPeriodSales).toHaveBeenCalledTimes(1)
    expect(second).toEqual(first)
  })

  it('group_by berbeda memakai key berbeda', async () => {
    const { service, spies } = buildService()

    await service.getSales({ ...pastRange, group_by: 'daily' })
    await service.getSales({ ...pastRange, group_by: 'monthly' })

    expect(spies.getPeriodSales).toHaveBeenCalledTimes(2)
  })

  it('product report dan cogs report mengikuti versi namespace produk', async () => {
    const { service, spies } = buildService()

    await service.getProducts({ ...pastRange, page: 1, limit: 10, sort: 'best_selling' })
    await service.getProducts({ ...pastRange, page: 1, limit: 10, sort: 'best_selling' })
    await service.getCogs({ ...pastRange })

    expect(spies.listProductSales).toHaveBeenCalledTimes(1)
    expect(spies.getCategoryCogs).toHaveBeenCalledTimes(1)
  })

  it('cashier report memakai cache', async () => {
    const { service, spies } = buildService()

    await service.getCashiers({ ...pastRange })
    await service.getCashiers({ ...pastRange })

    expect(spies.listCashierSales).toHaveBeenCalledTimes(1)
  })

  it('inventory valuation mengikuti versi namespace inventory', async () => {
    const { service, spies, cache } = buildService()

    await service.getInventoryValuation({})
    await service.getInventoryValuation({})
    expect(spies.getInventoryValuation).toHaveBeenCalledTimes(1)

    await cache.bumpVersion('inventory')
    await service.getInventoryValuation({})
    expect(spies.getInventoryValuation).toHaveBeenCalledTimes(2)
  })

  it('rentang lampau memakai TTL lebih panjang dari rentang berjalan', async () => {
    const past = buildService()
    await past.service.getSales({ ...pastRange, group_by: 'daily' })
    const pastTtl = past.client.ttls[0] ?? 0

    const current = buildService()
    const today = todayInJakarta()
    await current.service.getSales({ start_date: today, end_date: today, group_by: 'daily' })
    const currentTtl = current.client.ttls[0] ?? 0

    expect(pastTtl).toBeGreaterThan(currentTtl)
  })
})