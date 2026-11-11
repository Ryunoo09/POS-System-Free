import { Prisma } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProductWithCategory } from '../../src/mappers/product.mapper.js'
import type { ProductRepository } from '../../src/repositories/product.repository.js'
import type { StockMovementRepository } from '../../src/repositories/stock-movement.repository.js'
import type {
  CreateCheckoutData,
  TransactionDetailView,
  TransactionRepository,
  TransactionView,
} from '../../src/repositories/transaction.repository.js'
import {
  createTransactionService,
  type CheckoutActor,
  type TransactionActor,
} from '../../src/services/transaction.service.js'
import type { PriceService } from '../../src/services/price.service.js'
import type { CheckoutInput } from '../../src/validators/transaction.validator.js'

vi.mock('../../src/config/database.js', () => ({
  runInTransaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn({}),
}))

const actor: CheckoutActor = {
  id: 'cashier-1',
  name: 'Kasir Uji',
  canViewCostPrice: false,
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
  costPrice: new Prisma.Decimal('2000.00'),
  averageCost: new Prisma.Decimal('2000.00'),
  sellingPrice: new Prisma.Decimal('3500.00'),
  stock: 10,
  minStock: 5,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  category: { id: 'category-1', name: 'Makanan' },
  ...overrides,
})

const buildDetailFromData = (data: CreateCheckoutData): TransactionDetailView => ({
  id: 'tx-1',
  invoiceNumber: data.invoiceNumber,
  idempotencyKey: data.idempotencyKey,
  cashierId: data.cashierId,
  status: 'COMPLETED',
  subtotal: new Prisma.Decimal(data.subtotal),
  discountAmount: new Prisma.Decimal(data.discountAmount),
  taxAmount: new Prisma.Decimal(data.taxAmount),
  totalAmount: new Prisma.Decimal(data.totalAmount),
  paymentMethod: data.paymentMethod,
  paymentReference: data.paymentReference,
  amountPaid: new Prisma.Decimal(data.amountPaid),
  changeAmount: new Prisma.Decimal(data.changeAmount),
  shiftId: null,
  createdAt: new Date('2026-11-06T00:00:00Z'),
  cashier: { id: data.cashierId, name: 'Kasir Uji' },
  items: data.items.map((item, index) => ({
    id: `item-${index}`,
    transactionId: 'tx-1',
    productId: item.productId,
    productNameSnapshot: item.productName,
    productSkuSnapshot: item.productSku,
    quantity: item.quantity,
    unitPrice: new Prisma.Decimal(item.unitPrice),
    unitCost: new Prisma.Decimal(item.unitCost),
    discountAmount: new Prisma.Decimal(item.discountAmount),
    subtotal: new Prisma.Decimal(item.subtotal),
  })),
})

const buildView = (overrides: Partial<TransactionView> = {}): TransactionView => ({
  id: 'tx-1',
  invoiceNumber: 'INV-20261106-000001',
  idempotencyKey: key,
  cashierId: 'cashier-1',
  status: 'COMPLETED',
  subtotal: new Prisma.Decimal('7000.00'),
  discountAmount: new Prisma.Decimal('0.00'),
  taxAmount: new Prisma.Decimal('0.00'),
  totalAmount: new Prisma.Decimal('7000.00'),
  paymentMethod: 'CASH',
  paymentReference: null,
  amountPaid: new Prisma.Decimal('20000.00'),
  changeAmount: new Prisma.Decimal('13000.00'),
  shiftId: null,
  createdAt: new Date('2026-11-06T00:00:00Z'),
  cashier: { id: 'cashier-1', name: 'Kasir Uji' },
  _count: { items: 1 },
  ...overrides,
})

const buildDetail = (overrides: Partial<TransactionDetailView> = {}): TransactionDetailView => ({
  ...buildDetailFromData({
    invoiceNumber: 'INV-20261106-000001',
    idempotencyKey: key,
    cashierId: 'cashier-1',
    subtotal: '7000.00',
    discountAmount: '0.00',
    taxAmount: '0.00',
    totalAmount: '7000.00',
    paymentMethod: 'CASH',
    paymentReference: null,
    amountPaid: '20000.00',
    changeAmount: '13000.00',
    items: [
      {
        productId: 'product-1',
        productName: 'Produk Uji',
        productSku: 'SKU-1',
        quantity: 2,
        unitPrice: '3500.00',
        unitCost: '2000.00',
        discountAmount: '0.00',
        subtotal: '7000.00',
      },
    ],
  }),
  ...overrides,
})

const buildProductRepository = (products: ProductWithCategory[]) => {
  const updateStock = vi.fn(async (id: string, stock: number) => buildProduct({ id, stock }))
  const findManyByIdsForUpdate = vi.fn(async () => products)

  const repository: ProductRepository = {
    list: async () => ({ items: [], total: 0 }),
    findById: async () => products[0] ?? null,
    findByIdForUpdate: async () => products[0] ?? null,
    findManyByIdsForUpdate,
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

  return { repository, updateStock, findManyByIdsForUpdate }
}

const buildMovementRepository = () => {
  const create = vi.fn<StockMovementRepository['create']>(async () => ({
    id: 'movement-1',
    productId: 'product-1',
    movementType: 'SALE',
    quantity: -2,
    stockBefore: 10,
    stockAfter: 8,
    referenceType: 'TRANSACTION',
    referenceId: 'tx-1',
    notes: null,
    createdById: 'cashier-1',
    createdAt: new Date('2026-11-06T00:00:00Z'),
  }))

  const repository: StockMovementRepository = {
    create,
    list: async () => ({ items: [], total: 0 }),
  }

  return { repository, create }
}

const buildPriceService = (): PriceService => ({
  recordPriceChanges: async () => {},
  listHistory: async () => [],
  listCostHistory: async () => [],
  applyDueScheduledPrices: vi.fn(async () => 0),
  schedulePrice: async () => {
    throw new Error('tidak dipakai')
  },
  getScheduledPrice: async () => null,
  cancelScheduledPrice: async () => {},
  bulkPreview: async () => [],
  bulkApply: async () => ({ updated: 0 }),
})

const buildTransactionRepository = (existing: TransactionDetailView | null = null) => {
  const findByIdempotencyKey = vi.fn(async () => existing)
  const createCheckout = vi.fn(async (data: CreateCheckoutData) => buildDetailFromData(data))
  const nextInvoiceSequence = vi.fn(async () => 21)

  const repository: TransactionRepository = {
    list: async () => ({ items: [], total: 0 }),
    listCashiers: async () => [],
    findDetailById: async () => null,
    findByIdempotencyKey,
    createCheckout,
    nextInvoiceSequence,
  }

  return { repository, findByIdempotencyKey, createCheckout, nextInvoiceSequence }
}

const buildService = ({
  products = [buildProduct()],
  existing = null,
}: {
  products?: ProductWithCategory[]
  existing?: TransactionDetailView | null
} = {}) => {
  const productRepository = buildProductRepository(products)
  const movementRepository = buildMovementRepository()
  const transactionRepository = buildTransactionRepository(existing)
  const priceService = buildPriceService()

  return {
    service: createTransactionService({
      transactionRepository: transactionRepository.repository,
      productRepository: productRepository.repository,
      stockMovementRepository: movementRepository.repository,
      priceService,
      taxRate: 0,
    }),
    ...productRepository,
    ...movementRepository,
    ...transactionRepository,
    priceService,
  }
}

const checkoutInput = (overrides: Partial<CheckoutInput> = {}): CheckoutInput => ({
  items: [{ product_id: 'product-1', quantity: 2 }],
  discount_amount: 0,
  payment: { method: 'CASH', amount_paid: 20000 },
  ...overrides,
})

const key = '3f2a8c1e-6b4d-4a9e-9c2f-1a2b3c4d5e6f'

describe('TransactionService.checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('membuat transaksi, mengurangi stok, dan mencatat movement SALE', async () => {
    const { service, createCheckout, updateStock, create } = buildService()

    const result = await service.checkout(checkoutInput(), actor, key)

    expect(result.replayed).toBe(false)
    expect(createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        cashierId: 'cashier-1',
        subtotal: '7000.00',
        totalAmount: '7000.00',
        amountPaid: '20000.00',
        changeAmount: '13000.00',
        invoiceNumber: expect.stringMatching(/^INV-\d{8}-000021$/),
      }),
      expect.anything(),
    )
    expect(updateStock).toHaveBeenCalledWith('product-1', 8, expect.anything())
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        movementType: 'SALE',
        quantity: -2,
        stockBefore: 10,
        stockAfter: 8,
        referenceType: 'TRANSACTION',
      }),
      expect.anything(),
    )
    expect(result.transaction.items[0]?.unit_cost).toBeUndefined()
  })

  it('menampilkan unit_cost bila aktor punya akses cost-price', async () => {
    const { service } = buildService()

    const result = await service.checkout(
      checkoutInput(),
      { ...actor, canViewCostPrice: true },
      key,
    )

    expect(result.transaction.items[0]?.unit_cost).toBe('2000.00')
  })

  it('menerapkan harga terjadwal yang jatuh tempo sebelum mengambil produk', async () => {
    const { service, priceService } = buildService()

    await service.checkout(checkoutInput(), actor, key)

    expect(priceService.applyDueScheduledPrices).toHaveBeenCalledWith(expect.anything(), [
      'product-1',
    ])
  })

  it('memakai averageCost sebagai snapshot unit_cost', async () => {
    const { service } = buildService({
      products: [
        buildProduct({
          costPrice: new Prisma.Decimal('2000.00'),
          averageCost: new Prisma.Decimal('2500.00'),
        }),
      ],
    })

    const result = await service.checkout(
      checkoutInput(),
      { ...actor, canViewCostPrice: true },
      key,
    )

    expect(result.transaction.items[0]?.unit_cost).toBe('2500.00')
  })

  it('memakai costPrice saat averageCost masih 0', async () => {
    const { service } = buildService({
      products: [
        buildProduct({
          costPrice: new Prisma.Decimal('2000.00'),
          averageCost: new Prisma.Decimal('0'),
        }),
      ],
    })

    const result = await service.checkout(
      checkoutInput(),
      { ...actor, canViewCostPrice: true },
      key,
    )

    expect(result.transaction.items[0]?.unit_cost).toBe('2000.00')
  })

  it('mengembalikan transaksi lama untuk idempotency key yang sama', async () => {
    const existing = buildDetailFromData({
      invoiceNumber: 'INV-20261106-000021',
      idempotencyKey: key,
      cashierId: 'cashier-1',
      subtotal: '7000.00',
      discountAmount: '0.00',
      taxAmount: '0.00',
      totalAmount: '7000.00',
      paymentMethod: 'CASH',
      paymentReference: null,
      amountPaid: '20000.00',
      changeAmount: '13000.00',
      items: [],
    })
    const { service, createCheckout } = buildService({ existing })

    const result = await service.checkout(checkoutInput(), actor, key)

    expect(result.replayed).toBe(true)
    expect(result.transaction.invoice_number).toBe('INV-20261106-000021')
    expect(createCheckout).not.toHaveBeenCalled()
  })

  it('menolak idempotency key milik kasir lain', async () => {
    const existing = buildDetailFromData({
      invoiceNumber: 'INV-20261106-000021',
      idempotencyKey: key,
      cashierId: 'cashier-2',
      subtotal: '7000.00',
      discountAmount: '0.00',
      taxAmount: '0.00',
      totalAmount: '7000.00',
      paymentMethod: 'CASH',
      paymentReference: null,
      amountPaid: '20000.00',
      changeAmount: '13000.00',
      items: [],
    })
    const { service } = buildService({ existing })

    await expect(service.checkout(checkoutInput(), actor, key)).rejects.toMatchObject({
      code: 'IDEMPOTENCY_KEY_CONFLICT',
      statusCode: 409,
    })
  })

  it('menolak produk nonaktif tanpa mengubah stok', async () => {
    const { service, createCheckout, updateStock } = buildService({
      products: [buildProduct({ isActive: false })],
    })

    await expect(service.checkout(checkoutInput(), actor, key)).rejects.toMatchObject({
      code: 'PRODUCT_INACTIVE',
      statusCode: 422,
    })
    expect(createCheckout).not.toHaveBeenCalled()
    expect(updateStock).not.toHaveBeenCalled()
  })

  it('mengumpulkan semua pelanggaran stok', async () => {
    const { service } = buildService({
      products: [buildProduct({ stock: 1 })],
    })

    await expect(service.checkout(checkoutInput(), actor, key)).rejects.toMatchObject({
      code: 'INSUFFICIENT_STOCK',
      errors: [{ field: 'items[0].quantity', message: 'Produk Uji: diminta 2, tersedia 1' }],
    })
  })

  it('menolak pembayaran tunai yang kurang', async () => {
    const { service } = buildService()

    await expect(
      service.checkout(
        checkoutInput({ payment: { method: 'CASH', amount_paid: 1000 } }),
        actor,
        key,
      ),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_PAYMENT', statusCode: 422 })
  })

  it('menolak pembayaran non-tunai yang tidak sama dengan total', async () => {
    const { service } = buildService()

    await expect(
      service.checkout(
        checkoutInput({ payment: { method: 'QRIS', amount_paid: 7001 } }),
        actor,
        key,
      ),
    ).rejects.toMatchObject({ code: 'INVALID_PAYMENT_AMOUNT', statusCode: 422 })
  })

  it('menolak diskon transaksi yang melebihi subtotal', async () => {
    const { service } = buildService()

    await expect(
      service.checkout(checkoutInput({ discount_amount: 8000 }), actor, key),
    ).rejects.toMatchObject({ code: 'INVALID_DISCOUNT', statusCode: 422 })
  })

  it('memakai harga dari database, bukan dari request', async () => {
    const { service } = buildService({
      products: [buildProduct({ sellingPrice: new Prisma.Decimal('5000.00') })],
    })

    const result = await service.checkout(
      checkoutInput({ payment: { method: 'CASH', amount_paid: 20000 } }),
      actor,
      key,
    )

    expect(result.transaction.subtotal).toBe('10000.00')
    expect(result.transaction.total_amount).toBe('10000.00')
  })
})

const readActor = (overrides: Partial<TransactionActor> = {}): TransactionActor => ({
  userId: 'cashier-1',
  canReadAll: false,
  canViewCostPrice: false,
  ...overrides,
})

const buildReadService = ({
  items = [buildView()],
  detail = buildDetail() as TransactionDetailView | null,
}: {
  items?: TransactionView[]
  detail?: TransactionDetailView | null
} = {}) => {
  const list = vi.fn(async () => ({ items, total: items.length }))
  const findDetailById = vi.fn(async () => detail)
  const listCashiers = vi.fn(async () => [{ id: 'cashier-1', name: 'Kasir Uji' }])

  const repository: TransactionRepository = {
    list,
    listCashiers,
    findDetailById,
    findByIdempotencyKey: async () => null,
    createCheckout: async () => {
      throw new Error('tidak dipakai')
    },
    nextInvoiceSequence: async () => 1,
  }

  const service = createTransactionService({
    transactionRepository: repository,
    productRepository: buildProductRepository([]).repository,
    stockMovementRepository: buildMovementRepository().repository,
    priceService: buildPriceService(),
    taxRate: 0,
  })

  return { service, list, findDetailById, listCashiers }
}

describe('TransactionService.list', () => {
  it('memaksa cashier_id milik sendiri dan meneruskan filter lain', async () => {
    const { service, list } = buildReadService()

    await service.list(
      {
        page: 2,
        limit: 5,
        cashier_id: 'cashier-2',
        payment_method: 'QRIS',
        search: 'INV-2026',
        start_date: '2026-11-01',
        end_date: '2026-11-02',
      },
      readActor(),
    )

    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
        cashierId: 'cashier-1',
        paymentMethod: 'QRIS',
        search: 'INV-2026',
        startAt: new Date('2026-10-31T17:00:00.000Z'),
        endAt: new Date('2026-11-02T16:59:59.999Z'),
      }),
    )
  })

  it('memakai cashier_id dari query untuk pembaca semua transaksi', async () => {
    const { service, list } = buildReadService()

    await service.list({ page: 1, limit: 10, cashier_id: 'cashier-2' }, readActor({ canReadAll: true }))

    expect(list).toHaveBeenCalledWith(expect.objectContaining({ cashierId: 'cashier-2' }))
  })
})

describe('TransactionService.detail', () => {
  it('membuka unit_cost hanya untuk aktor berizin', async () => {
    const { service } = buildReadService()

    const allowed = await service.detail('tx-1', readActor({ canViewCostPrice: true }))
    const denied = await service.detail('tx-1', readActor())

    expect(allowed.items[0]?.unit_cost).toBe('2000.00')
    expect(denied.items[0]?.unit_cost).toBeUndefined()
  })

  it('mengembalikan 404 untuk transaksi kasir lain', async () => {
    const { service } = buildReadService()

    await expect(service.detail('tx-1', readActor({ userId: 'cashier-2' }))).rejects.toMatchObject({
      code: 'NOT_FOUND',
      statusCode: 404,
    })
  })

  it('mengembalikan 404 untuk transaksi yang tidak ada', async () => {
    const { service } = buildReadService({ detail: null })

    await expect(service.detail('tx-1', readActor())).rejects.toMatchObject({
      code: 'NOT_FOUND',
      statusCode: 404,
    })
  })

  it('meneruskan daftar kasir dari repository', async () => {
    const { service, listCashiers } = buildReadService()

    await expect(service.cashiers()).resolves.toEqual([{ id: 'cashier-1', name: 'Kasir Uji' }])
    expect(listCashiers).toHaveBeenCalledOnce()
  })
})
