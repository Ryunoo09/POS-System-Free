import { Prisma, type Category } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import type { CategoryRepository } from '../../src/repositories/category.repository.js'
import type {
  ListProductsInput,
  ProductRepository,
} from '../../src/repositories/product.repository.js'
import type { StockMovementRepository } from '../../src/repositories/stock-movement.repository.js'
import type { ProductWithCategory } from '../../src/mappers/product.mapper.js'
import { createProductService, type ProductActor } from '../../src/services/product.service.js'
import type { PriceService } from '../../src/services/price.service.js'
import type { CreateProductInput } from '../../src/validators/product.validator.js'
import { isValidEan13 } from '../../src/utils/barcode.js'

vi.mock('../../src/config/database.js', () => ({
  runInTransaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn({}),
}))

const adminActor: ProductActor = { id: 'admin-1', canViewCostPrice: true, isCashier: false }
const cashierActor: ProductActor = { id: 'cashier-1', canViewCostPrice: false, isCashier: true }

const buildProduct = (overrides: Partial<ProductWithCategory> = {}): ProductWithCategory => ({
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
  category: { id: 'category-1', name: 'Makanan' },
  ...overrides,
})

const buildCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 'category-1',
  name: 'Makanan',
  description: null,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
})

const buildProductRepository = (
  overrides: Partial<ProductRepository> = {},
): ProductRepository => ({
  list: async () => ({ items: [], total: 0 }),
  findById: async () => null,
  findByIdForUpdate: async () => null,
  findManyByIdsForUpdate: async () => [],
  findBySku: async () => null,
  findByBarcode: async () => null,
  findManyByIds: async () => [],
  create: async () => {
    throw new Error('tidak dipakai pada test ini')
  },
  update: async () => {
    throw new Error('tidak dipakai pada test ini')
  },
  updateStock: async () => {
    throw new Error('tidak dipakai pada test ini')
  },
  ...overrides,
})

const buildCategoryRepository = (
  overrides: Partial<CategoryRepository> = {},
): CategoryRepository => ({
  list: async () => ({ items: [], total: 0 }),
  findById: async () => buildCategory(),
  findByName: async () => null,
  countProducts: async () => 0,
  create: async () => {
    throw new Error('tidak dipakai pada test ini')
  },
  update: async () => {
    throw new Error('tidak dipakai pada test ini')
  },
  delete: async () => {
    throw new Error('tidak dipakai pada test ini')
  },
  ...overrides,
})

const buildStockMovementRepository = (): StockMovementRepository => ({
  create: async () => {
    throw new Error('tidak dipakai pada test ini')
  },
  list: async () => ({ items: [], total: 0 }),
})

const buildPriceService = (overrides: Partial<PriceService> = {}): PriceService => ({
  recordPriceChanges: async () => {},
  listHistory: async () => [],
  listCostHistory: async () => [],
  applyDueScheduledPrices: async () => 0,
  schedulePrice: async () => {
    throw new Error('tidak dipakai pada test ini')
  },
  getScheduledPrice: async () => null,
  cancelScheduledPrice: async () => {},
  bulkPreview: async () => [],
  bulkApply: async () => ({ updated: 0 }),
  ...overrides,
})

const validInput = (overrides: Partial<CreateProductInput> = {}): CreateProductInput => ({
  sku: 'SKU-1',
  name: 'Produk Uji',
  category_id: 'category-1',
  unit: 'pcs',
  cost_price: 1000,
  selling_price: 1500,
  stock: 5,
  min_stock: 2,
  ...overrides,
})

const buildService = (repositories: {
  productRepository?: ProductRepository
  categoryRepository?: CategoryRepository
  priceService?: PriceService
} = {}) =>
  createProductService({
    productRepository: repositories.productRepository ?? buildProductRepository(),
    categoryRepository: repositories.categoryRepository ?? buildCategoryRepository(),
    stockMovementRepository: buildStockMovementRepository(),
    priceService: repositories.priceService ?? buildPriceService(),
  })

describe('ProductService.create', () => {
  it('menolak SKU duplikat dengan 409 DUPLICATE_SKU', async () => {
    const service = buildService({
      productRepository: buildProductRepository({ findBySku: async () => buildProduct() }),
    })

    await expect(service.create(validInput(), adminActor)).rejects.toMatchObject({
      statusCode: 409,
      code: 'DUPLICATE_SKU',
    })
  })

  it('menolak barcode duplikat dengan 409 DUPLICATE_BARCODE', async () => {
    const service = buildService({
      productRepository: buildProductRepository({ findByBarcode: async () => buildProduct() }),
    })

    await expect(
      service.create(validInput({ barcode: '8991000000028' }), adminActor),
    ).rejects.toMatchObject({ statusCode: 409, code: 'DUPLICATE_BARCODE' })
  })

  it('menolak kategori nonaktif dengan 422 CATEGORY_INACTIVE', async () => {
    const service = buildService({
      categoryRepository: buildCategoryRepository({
        findById: async () => buildCategory({ isActive: false }),
      }),
    })

    await expect(service.create(validInput(), adminActor)).rejects.toMatchObject({
      statusCode: 422,
      code: 'CATEGORY_INACTIVE',
    })
  })

  it('menolak kategori yang tidak ditemukan dengan 404', async () => {
    const service = buildService({
      categoryRepository: buildCategoryRepository({ findById: async () => null }),
    })

    await expect(service.create(validInput(), adminActor)).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})

describe('ProductService.list', () => {
  it('memaksa is_active=true dan menyembunyikan cost_price untuk Cashier', async () => {
    let captured: ListProductsInput | undefined
    const service = buildService({
      productRepository: buildProductRepository({
        list: async (input) => {
          captured = input
          return { items: [buildProduct()], total: 1 }
        },
      }),
    })

    const result = await service.list({ page: 1, limit: 10, is_active: false }, cashierActor)

    expect(captured?.isActive).toBe(true)
    expect(result.items[0]).not.toHaveProperty('cost_price')
    expect(result.items[0]?.selling_price).toBe('1500.00')
    expect(result.meta).toEqual({ page: 1, limit: 10, total_items: 1, total_pages: 1 })
  })

  it('menghormati filter is_active dan menampilkan cost_price untuk Admin', async () => {
    let captured: ListProductsInput | undefined
    const service = buildService({
      productRepository: buildProductRepository({
        list: async (input) => {
          captured = input
          return { items: [buildProduct()], total: 1 }
        },
      }),
    })

    const result = await service.list({ page: 2, limit: 5, is_active: false }, adminActor)

    expect(captured?.isActive).toBe(false)
    expect(result.items[0]).toHaveProperty('cost_price', '1000.00')
    expect(result.meta.page).toBe(2)
  })
})

describe('ProductService.applyDueScheduledPrices', () => {
  it('menerapkan jadwal jatuh tempo sebelum list', async () => {
    const applyDueScheduledPrices = vi.fn(async () => 1)
    const service = buildService({ priceService: buildPriceService({ applyDueScheduledPrices }) })

    await service.list({ page: 1, limit: 10 }, adminActor)

    expect(applyDueScheduledPrices).toHaveBeenCalledWith()
  })

  it('menerapkan jadwal hanya untuk produk yang diminta pada getById', async () => {
    const applyDueScheduledPrices = vi.fn(async () => 1)
    const service = buildService({
      productRepository: buildProductRepository({ findById: async () => buildProduct() }),
      priceService: buildPriceService({ applyDueScheduledPrices }),
    })

    await service.getById('product-1', adminActor)

    expect(applyDueScheduledPrices).toHaveBeenCalledWith(undefined, ['product-1'])
  })
})

describe('ProductService.update audit hook', () => {
  it('mencatat perubahan harga produk ke audit log', async () => {
    const record = vi.fn(async () => {})
    const service = createProductService({
      productRepository: buildProductRepository({
        findById: async () => buildProduct(),
        update: async () => buildProduct({ sellingPrice: new Prisma.Decimal('2000.00') }),
      }),
      categoryRepository: buildCategoryRepository(),
      stockMovementRepository: buildStockMovementRepository(),
      audit: { record },
      priceService: buildPriceService(),
    })

    await service.update('product-1', { selling_price: 2000 }, adminActor)

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        entity: 'PRODUCT',
        entityId: 'product-1',
        oldValue: { selling_price: '1500.00' },
        newValue: { selling_price: '2000.00' },
      }),
    )
  })

  it('tidak mencatat audit bila tidak ada field yang berubah', async () => {
    const record = vi.fn(async () => {})
    const service = createProductService({
      productRepository: buildProductRepository({
        findById: async () => buildProduct(),
        update: async () => buildProduct(),
      }),
      categoryRepository: buildCategoryRepository(),
      stockMovementRepository: buildStockMovementRepository(),
      audit: { record },
      priceService: buildPriceService(),
    })

    await service.update('product-1', { name: 'Produk Uji' }, adminActor)

    expect(record).not.toHaveBeenCalled()
  })

  it('mencatat riwayat harga saat selling_price berubah', async () => {
    const recordPriceChanges = vi.fn(async () => {})
    const service = buildService({
      productRepository: buildProductRepository({
        findById: async () => buildProduct(),
        update: async () => buildProduct({ sellingPrice: new Prisma.Decimal('2000.00') }),
      }),
      priceService: buildPriceService({ recordPriceChanges }),
    })

    await service.update('product-1', { selling_price: 2000 }, adminActor)

    expect(recordPriceChanges).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'product-1',
        source: 'MANUAL',
        before: expect.objectContaining({ sellingPrice: '1500.00', costPrice: '1000.00' }),
        after: expect.objectContaining({ sellingPrice: '2000.00', costPrice: '1000.00' }),
      }),
    )
  })
})

describe('ProductService.generateBarcode', () => {
  it('menghasilkan EAN-13 internal yang valid', async () => {
    let captured: string | null = null
    const record = vi.fn(async () => {})
    const service = createProductService({
      productRepository: buildProductRepository({
        findById: async () => buildProduct(),
        update: async (_id, data) => {
          captured = data.barcode ?? null
          return buildProduct({ barcode: captured })
        },
      }),
      categoryRepository: buildCategoryRepository(),
      stockMovementRepository: buildStockMovementRepository(),
      audit: { record },
      priceService: buildPriceService(),
    })

    const result = await service.generateBarcode('product-1', adminActor)

    expect(captured).not.toBeNull()
    expect(isValidEan13(result.barcode)).toBe(true)
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ entity: 'PRODUCT', newValue: { barcode: result.barcode } }),
    )
  })

  it('menolak produk yang sudah punya barcode dengan 409', async () => {
    const service = buildService({
      productRepository: buildProductRepository({
        findById: async () => buildProduct({ barcode: '4006381333931' }),
      }),
    })

    await expect(service.generateBarcode('product-1', adminActor)).rejects.toMatchObject({
      statusCode: 409,
      code: 'BARCODE_ALREADY_EXISTS',
    })
  })

  it('melewati kandidat yang bentrok lalu memakai yang unik', async () => {
    let attempts = 0
    const service = buildService({
      productRepository: buildProductRepository({
        findById: async () => buildProduct(),
        findByBarcode: async () => {
          attempts += 1
          return attempts === 1 ? buildProduct() : null
        },
        update: async (_id, data) => buildProduct({ barcode: data.barcode ?? null }),
      }),
    })

    const result = await service.generateBarcode('product-1', adminActor)

    expect(attempts).toBeGreaterThanOrEqual(2)
    expect(isValidEan13(result.barcode)).toBe(true)
  })

  it('menolak produk yang tidak ditemukan dengan 404', async () => {
    const service = buildService({
      productRepository: buildProductRepository({ findById: async () => null }),
    })

    await expect(service.generateBarcode('product-1', adminActor)).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})
