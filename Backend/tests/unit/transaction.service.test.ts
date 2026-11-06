import { Prisma } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProductWithCategory } from '../../src/mappers/product.mapper.js'
import type { ProductRepository } from '../../src/repositories/product.repository.js'
import type { StockMovementRepository } from '../../src/repositories/stock-movement.repository.js'
import type {
  CreateCheckoutData,
  TransactionDetailView,
  TransactionRepository,
} from '../../src/repositories/transaction.repository.js'
import {
  createTransactionService,
  type CheckoutActor,
} from '../../src/services/transaction.service.js'
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

const buildTransactionRepository = (existing: TransactionDetailView | null = null) => {
  const findByIdempotencyKey = vi.fn(async () => existing)
  const createCheckout = vi.fn(async (data: CreateCheckoutData) => buildDetailFromData(data))
  const nextInvoiceSequence = vi.fn(async () => 21)

  const repository: TransactionRepository = {
    list: async () => ({ items: [], total: 0 }),
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

  return {
    service: createTransactionService({
      transactionRepository: transactionRepository.repository,
      productRepository: productRepository.repository,
      stockMovementRepository: movementRepository.repository,
      taxRate: 0,
    }),
    ...productRepository,
    ...movementRepository,
    ...transactionRepository,
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
