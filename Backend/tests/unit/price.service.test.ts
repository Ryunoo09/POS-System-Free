import { Prisma, type ScheduledPriceChange } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import type { PriceHistoryView, PriceRepository } from '../../src/repositories/price.repository.js'
import type { ProductRepository, ProductView } from '../../src/repositories/product.repository.js'
import { createPriceService, type PriceActor } from '../../src/services/price.service.js'

vi.mock('../../src/config/database.js', () => ({
  runInTransaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn({}),
}))

const adminActor: PriceActor = { id: 'admin-1', canViewCostPrice: true }
const cashierActor: PriceActor = { id: 'cashier-1', canViewCostPrice: false }

const buildProduct = (overrides: Partial<ProductView> = {}): ProductView => ({
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
  minStock: 1,
  isActive: true,
  createdAt: new Date('2026-11-01T00:00:00.000Z'),
  updatedAt: new Date('2026-11-01T00:00:00.000Z'),
  category: { id: 'category-1', name: 'Kategori' },
  ...overrides,
})

const buildProductRepository = (
  overrides: Partial<ProductRepository> = {},
): ProductRepository => ({
  list: async () => ({ items: [], total: 0 }),
  findById: async () => buildProduct(),
  findByIdForUpdate: async () => buildProduct(),
  findManyByIdsForUpdate: async () => [buildProduct()],
  findBySku: async () => null,
  findByBarcode: async () => null,
  findManyByIds: async () => [buildProduct()],
  create: async () => {
    throw new Error('tidak dipakai pada test ini')
  },
  update: async () => buildProduct(),
  updateStock: async () => buildProduct(),
  ...overrides,
})

const buildPriceRepository = (overrides: Partial<PriceRepository> = {}): PriceRepository => ({
  createHistory: async () => {},
  listHistory: async () => [],
  findDueSchedules: async () => [],
  claimSchedule: async () => 0,
  createSchedule: async () => {
    throw new Error('tidak dipakai pada test ini')
  },
  findActiveSchedule: async () => null,
  cancelActiveSchedules: async () => 0,
  cancelSchedule: async () => 0,
  ...overrides,
})

const buildHistoryRow = (overrides: Partial<PriceHistoryView> = {}): PriceHistoryView => ({
  id: 'history-1',
  productId: 'product-1',
  field: 'SELLING_PRICE',
  oldValue: new Prisma.Decimal('1500.00'),
  newValue: new Prisma.Decimal('2000.00'),
  source: 'MANUAL',
  reason: null,
  changedById: 'admin-1',
  createdAt: new Date('2026-11-11T00:00:00.000Z'),
  changedBy: { id: 'admin-1', name: 'Admin Uji' },
  ...overrides,
})

const buildSchedule = (overrides: Partial<ScheduledPriceChange> = {}): ScheduledPriceChange => ({
  id: 'schedule-1',
  productId: 'product-1',
  sellingPrice: new Prisma.Decimal('2000.00'),
  effectiveDate: new Date('2026-11-01T00:00:00.000Z'),
  status: 'SCHEDULED',
  reason: 'Naik harga',
  createdById: 'admin-1',
  appliedAt: null,
  createdAt: new Date('2026-10-01T00:00:00.000Z'),
  updatedAt: new Date('2026-10-01T00:00:00.000Z'),
  ...overrides,
})

describe('PriceService.recordPriceChanges', () => {
  it('mencatat satu baris saat hanya harga jual berubah', async () => {
    const createHistory = vi.fn(async () => {})
    const service = createPriceService({
      priceRepository: buildPriceRepository({ createHistory }),
      productRepository: buildProductRepository(),
    })

    await service.recordPriceChanges({
      productId: 'product-1',
      before: { sellingPrice: '1500.00', costPrice: '1000.00' },
      after: { sellingPrice: '2000.00', costPrice: '1000.00' },
      source: 'MANUAL',
      reason: null,
      changedById: 'admin-1',
    })

    expect(createHistory).toHaveBeenCalledTimes(1)
    expect(createHistory).toHaveBeenCalledWith(
      expect.objectContaining({ field: 'SELLING_PRICE', newValue: '2000.00' }),
      undefined,
    )
  })

  it('mencatat dua baris saat harga jual dan pokok berubah', async () => {
    const createHistory = vi.fn(async () => {})
    const service = createPriceService({
      priceRepository: buildPriceRepository({ createHistory }),
      productRepository: buildProductRepository(),
    })

    await service.recordPriceChanges({
      productId: 'product-1',
      before: { sellingPrice: '1500.00', costPrice: '1000.00' },
      after: { sellingPrice: '2000.00', costPrice: '1200.00' },
      source: 'MANUAL',
      reason: null,
      changedById: 'admin-1',
    })

    expect(createHistory).toHaveBeenCalledTimes(2)
  })

  it('tidak mencatat bila tidak ada perubahan', async () => {
    const createHistory = vi.fn(async () => {})
    const service = createPriceService({
      priceRepository: buildPriceRepository({ createHistory }),
      productRepository: buildProductRepository(),
    })

    await service.recordPriceChanges({
      productId: 'product-1',
      before: { sellingPrice: '1500.00', costPrice: '1000.00' },
      after: { sellingPrice: '1500.00', costPrice: '1000.00' },
      source: 'MANUAL',
      reason: null,
      changedById: 'admin-1',
    })

    expect(createHistory).not.toHaveBeenCalled()
  })
})

describe('PriceService.listHistory', () => {
  it('menyembunyikan baris harga pokok dari user tanpa cost-price:read', async () => {
    const service = createPriceService({
      priceRepository: buildPriceRepository({
        listHistory: async () => [
          buildHistoryRow({ id: 'h1', field: 'SELLING_PRICE' }),
          buildHistoryRow({ id: 'h2', field: 'COST_PRICE' }),
        ],
      }),
      productRepository: buildProductRepository(),
    })

    const rows = await service.listHistory('product-1', cashierActor)

    expect(rows.map((row) => row.field)).toEqual(['SELLING_PRICE'])
  })

  it('menampilkan semua baris untuk user dengan cost-price:read', async () => {
    const service = createPriceService({
      priceRepository: buildPriceRepository({
        listHistory: async () => [
          buildHistoryRow({ id: 'h1' }),
          buildHistoryRow({ id: 'h2', field: 'COST_PRICE' }),
        ],
      }),
      productRepository: buildProductRepository(),
    })

    const rows = await service.listHistory('product-1', adminActor)

    expect(rows).toHaveLength(2)
    expect(rows[0]?.old_value).toBe('1500.00')
  })
})

describe('PriceService.applyDueScheduledPrices', () => {
  it('menerapkan jadwal yang jatuh tempo sekali saja dan mencatat history', async () => {
    const update = vi.fn(async () => buildProduct())
    const createHistory = vi.fn(async () => {})
    const claimSchedule = vi.fn(async () => 1)
    const service = createPriceService({
      priceRepository: buildPriceRepository({
        findDueSchedules: async () => [buildSchedule()],
        claimSchedule,
        createHistory,
      }),
      productRepository: buildProductRepository({ update }),
    })

    const applied = await service.applyDueScheduledPrices({} as never, ['product-1'])

    expect(applied).toBe(1)
    expect(claimSchedule).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith('product-1', { sellingPrice: '2000.00' }, {})
    expect(createHistory).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'SCHEDULED', newValue: '2000.00' }),
      {},
    )
  })

  it('tidak menerapkan ulang saat klaim gagal (sudah diproses request lain)', async () => {
    const update = vi.fn(async () => buildProduct())
    const service = createPriceService({
      priceRepository: buildPriceRepository({
        findDueSchedules: async () => [buildSchedule()],
        claimSchedule: async () => 0,
      }),
      productRepository: buildProductRepository({ update }),
    })

    const applied = await service.applyDueScheduledPrices({} as never, ['product-1'])

    expect(applied).toBe(0)
    expect(update).not.toHaveBeenCalled()
  })

  it('melewati history bila harga sama', async () => {
    const update = vi.fn(async () => buildProduct())
    const createHistory = vi.fn(async () => {})
    const service = createPriceService({
      priceRepository: buildPriceRepository({
        findDueSchedules: async () => [
          buildSchedule({ sellingPrice: new Prisma.Decimal('1500.00') }),
        ],
        claimSchedule: async () => 1,
        createHistory,
      }),
      productRepository: buildProductRepository({ update }),
    })

    const applied = await service.applyDueScheduledPrices({} as never, ['product-1'])

    expect(applied).toBe(0)
    expect(update).not.toHaveBeenCalled()
    expect(createHistory).not.toHaveBeenCalled()
  })
})

describe('PriceService.schedulePrice', () => {
  it('membatalkan jadwal aktif lalu membuat jadwal baru', async () => {
    const cancelActiveSchedules = vi.fn(async () => 1)
    const service = createPriceService({
      priceRepository: buildPriceRepository({
        cancelActiveSchedules,
        createSchedule: async () => buildSchedule(),
      }),
      productRepository: buildProductRepository(),
    })

    const result = await service.schedulePrice(
      'product-1',
      {
        selling_price: 2000,
        effective_date: new Date(Date.now() + 86_400_000),
        reason: 'Naik harga bulan depan',
      },
      adminActor,
    )

    expect(cancelActiveSchedules).toHaveBeenCalledWith('product-1', {})
    expect(result.selling_price).toBe('2000.00')
    expect(result.status).toBe('SCHEDULED')
  })

  it('menolak tanggal berlaku di masa lalu', async () => {
    const service = createPriceService({
      priceRepository: buildPriceRepository(),
      productRepository: buildProductRepository(),
    })

    await expect(
      service.schedulePrice(
        'product-1',
        {
          selling_price: 2000,
          effective_date: new Date(Date.now() - 1000),
          reason: 'Terlambat',
        },
        adminActor,
      ),
    ).rejects.toMatchObject({ statusCode: 422, code: 'INVALID_EFFECTIVE_DATE' })
  })
})

describe('PriceService.bulk', () => {
  it('preview menghitung harga baru tanpa menulis', async () => {
    const createHistory = vi.fn(async () => {})
    const service = createPriceService({
      priceRepository: buildPriceRepository({ createHistory }),
      productRepository: buildProductRepository(),
    })

    const items = await service.bulkPreview({
      mode: 'PERCENT',
      value: 10,
      product_ids: ['product-1'],
    })

    expect(items).toEqual([
      {
        id: 'product-1',
        name: 'Produk Uji',
        sku: 'SKU-1',
        old_price: '1500.00',
        new_price: '1650.00',
      },
    ])
    expect(createHistory).not.toHaveBeenCalled()
  })

  it('apply menulis harga baru + history', async () => {
    const createHistory = vi.fn(async () => {})
    const update = vi.fn(async () => buildProduct())
    const service = createPriceService({
      priceRepository: buildPriceRepository({ createHistory }),
      productRepository: buildProductRepository({ update }),
    })

    const result = await service.bulkApply(
      { mode: 'NOMINAL', value: 500, product_ids: ['product-1'], reason: 'Penyesuaian pasar' },
      adminActor,
    )

    expect(result.updated).toBe(1)
    expect(update).toHaveBeenCalledWith('product-1', { sellingPrice: '2000.00' }, {})
    expect(createHistory).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'BULK', newValue: '2000.00' }),
      {},
    )
  })

  it('menolak hasil harga negatif', async () => {
    const service = createPriceService({
      priceRepository: buildPriceRepository(),
      productRepository: buildProductRepository(),
    })

    await expect(
      service.bulkPreview({ mode: 'NOMINAL', value: -5000, product_ids: ['product-1'] }),
    ).rejects.toMatchObject({ code: 'NEGATIVE_PRICE' })
  })
})
