import { Prisma, type TransactionItem } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import type { ProductWithCategory } from '../../src/mappers/product.mapper.js'
import type { ProductRepository } from '../../src/repositories/product.repository.js'
import type { ReturnRepository, ReturnView } from '../../src/repositories/return.repository.js'
import type { ShiftRepository } from '../../src/repositories/shift.repository.js'
import type { StockMovementRepository } from '../../src/repositories/stock-movement.repository.js'
import type {
  TransactionDetailView,
  TransactionRepository,
} from '../../src/repositories/transaction.repository.js'
import { createReturnService, type ReturnActor } from '../../src/services/return.service.js'
import type { CreateReturnInput } from '../../src/validators/return.validator.js'

vi.mock('../../src/config/database.js', () => ({
  runInTransaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn({}),
}))

const cashierActor: ReturnActor = {
  id: 'cashier-1',
  name: 'Kasir Satu',
  canReadAll: false,
}

const adminActor: ReturnActor = {
  id: 'admin-1',
  name: 'Admin',
  canReadAll: true,
}

const buildTransactionItem = (overrides: Partial<TransactionItem> = {}): TransactionItem => ({
  id: 'item-1',
  transactionId: 'tx-1',
  productId: 'product-1',
  productNameSnapshot: 'Kopi Susu',
  productSkuSnapshot: 'MKN-001',
  quantity: 2,
  unitPrice: new Prisma.Decimal('3500.00'),
  unitCost: new Prisma.Decimal('2000.00'),
  discountAmount: new Prisma.Decimal('0.00'),
  subtotal: new Prisma.Decimal('7000.00'),
  ...overrides,
})

const buildTransaction = (
  overrides: Partial<TransactionDetailView> = {},
): TransactionDetailView => ({
  id: 'tx-1',
  invoiceNumber: 'INV-20261106-000001',
  idempotencyKey: '11111111-1111-1111-1111-111111111111',
  cashierId: 'cashier-1',
  status: 'COMPLETED',
  subtotal: new Prisma.Decimal('7000.00'),
  discountAmount: new Prisma.Decimal('0.00'),
  taxAmount: new Prisma.Decimal('0.00'),
  totalAmount: new Prisma.Decimal('7000.00'),
  paymentMethod: 'CASH',
  paymentReference: null,
  amountPaid: new Prisma.Decimal('7000.00'),
  changeAmount: new Prisma.Decimal('0.00'),
  shiftId: null,
  createdAt: new Date('2026-11-06T03:00:00Z'),
  cashier: { id: 'cashier-1', name: 'Kasir Satu' },
  items: [buildTransactionItem()],
  ...overrides,
})

const buildReturnView = (overrides: Partial<ReturnView> = {}): ReturnView => ({
  id: 'ret-1',
  returnNumber: 'RET-20261106-ABC123',
  transactionId: 'tx-1',
  cashierId: 'cashier-1',
  shiftId: 'shift-1',
  status: 'COMPLETED',
  reason: 'Produk rusak',
  refundAmount: new Prisma.Decimal('3500.00'),
  refundMethod: 'CASH',
  createdAt: new Date('2026-11-06T03:30:00Z'),
  cashier: { id: 'cashier-1', name: 'Kasir Satu' },
  transaction: { id: 'tx-1', invoiceNumber: 'INV-20261106-000001' },
  items: [
    {
      id: 'ri-1',
      returnTransactionId: 'ret-1',
      transactionItemId: 'item-1',
      productId: 'product-1',
      quantity: 1,
      unitPrice: new Prisma.Decimal('3500.00'),
      subtotal: new Prisma.Decimal('3500.00'),
      action: 'RESTOCK',
      product: { id: 'product-1', name: 'Kopi Susu', sku: 'MKN-001' },
    },
  ],
  ...overrides,
})

const buildProduct = (overrides: Partial<ProductWithCategory> = {}): ProductWithCategory => ({
  id: 'product-1',
  sku: 'MKN-001',
  barcode: null,
  name: 'Kopi Susu',
  description: null,
  categoryId: 'category-1',
  unit: 'pcs',
  costPrice: new Prisma.Decimal('2000.00'),
  sellingPrice: new Prisma.Decimal('3500.00'),
  stock: 10,
  minStock: 2,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  category: { id: 'category-1', name: 'Minuman' },
  ...overrides,
})

const buildDependencies = (
  options: {
    transaction?: TransactionDetailView | null
    returnedQuantities?: Record<string, number>
    returnView?: ReturnView
    shiftId?: string | null
  } = {},
) => {
  const returnedQuantities = options.returnedQuantities ?? {}
  const returnView = options.returnView ?? buildReturnView()

  const createReturn = vi.fn(async () => returnView)
  const returnRepository: ReturnRepository = {
    create: createReturn,
    findById: async () => null,
    list: async () => ({ items: [], total: 0 }),
    sumReturnedQuantities: async () =>
      new Map(Object.entries(returnedQuantities)),
  }

  const findDetailById = vi.fn(
    async () => (options.transaction === undefined ? buildTransaction() : options.transaction),
  )
  const transactionRepository = {
    findDetailById,
    list: async () => ({ items: [], total: 0 }),
    listCashiers: async () => [],
    findByIdempotencyKey: async () => null,
    createCheckout: async () => {
      throw new Error('tidak dipakai')
    },
    nextInvoiceSequence: async () => 1,
  } as unknown as TransactionRepository

  const updateStock = vi.fn(async (id: string, stock: number) => buildProduct({ id, stock }))
  const productRepository = {
    list: async () => ({ items: [], total: 0 }),
    findById: async () => buildProduct(),
    findByIdForUpdate: async () => buildProduct(),
    findManyByIdsForUpdate: async () => [buildProduct()],
    findBySku: async () => null,
    findByBarcode: async () => null,
    create: async () => {
      throw new Error('tidak dipakai')
    },
    update: async () => {
      throw new Error('tidak dipakai')
    },
    updateStock,
  } as unknown as ProductRepository

  const createMovement = vi.fn(async () => undefined)
  const stockMovementRepository = {
    create: createMovement,
  } as unknown as StockMovementRepository

  const createCashMovement = vi.fn(async () => undefined)
  const shiftRepository = {
    findActiveByCashierId: async () =>
      options.shiftId === null ? null : { id: options.shiftId ?? 'shift-1' },
    createCashMovement,
  } as unknown as ShiftRepository

  const record = vi.fn(async () => {})

  const service = createReturnService({
    returnRepository,
    transactionRepository,
    productRepository,
    stockMovementRepository,
    shiftRepository,
    audit: { record },
  })

  return {
    service,
    createReturn,
    findDetailById,
    updateStock,
    createMovement,
    createCashMovement,
    record,
  }
}

const baseInput = (overrides: Partial<CreateReturnInput> = {}): CreateReturnInput => ({
  transaction_id: 'tx-1',
  reason: 'Produk rusak',
  refund_method: 'CASH',
  items: [{ transaction_item_id: 'item-1', quantity: 1, action: 'RESTOCK' }],
  ...overrides,
})

describe('ReturnService.create', () => {
  it('membuat retur, mengembalikan stok, memotong kas, dan mencatat audit', async () => {
    const deps = buildDependencies()

    const result = await deps.service.create(baseInput(), cashierActor)

    expect(deps.createReturn).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: 'tx-1',
        cashierId: 'cashier-1',
        shiftId: 'shift-1',
        refundAmount: '3500.00',
        refundMethod: 'CASH',
        items: [
          expect.objectContaining({
            transactionItemId: 'item-1',
            productId: 'product-1',
            quantity: 1,
            subtotal: '3500.00',
            action: 'RESTOCK',
          }),
        ],
      }),
      expect.anything(),
    )

    expect(deps.updateStock).toHaveBeenCalledWith('product-1', 11, expect.anything())
    expect(deps.createMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        movementType: 'RETURN',
        quantity: 1,
        stockBefore: 10,
        stockAfter: 11,
        referenceType: 'TRANSACTION',
        referenceId: 'tx-1',
      }),
      expect.anything(),
    )
    expect(deps.createCashMovement).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'CASH_OUT', amount: 3500, shiftId: 'shift-1' }),
      expect.anything(),
    )
    expect(deps.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', entity: 'RETURN', entityId: 'ret-1' }),
    )
    expect(result.refund_amount).toBe('3500.00')
    expect(result.transaction.invoice_number).toBe('INV-20261106-000001')
  })

  it('menolak kuantitas retur melebihi pembelian', async () => {
    const deps = buildDependencies()

    await expect(
      deps.service.create(
        baseInput({ items: [{ transaction_item_id: 'item-1', quantity: 3, action: 'RESTOCK' }] }),
        cashierActor,
      ),
    ).rejects.toMatchObject({ statusCode: 422, code: 'RETURN_QUANTITY_EXCEEDED' })

    expect(deps.createReturn).not.toHaveBeenCalled()
  })

  it('memperhitungkan kuantitas yang sudah pernah diretur', async () => {
    const deps = buildDependencies({ returnedQuantities: { 'item-1': 1 } })

    await expect(
      deps.service.create(
        baseInput({ items: [{ transaction_item_id: 'item-1', quantity: 2, action: 'RESTOCK' }] }),
        cashierActor,
      ),
    ).rejects.toMatchObject({ code: 'RETURN_QUANTITY_EXCEEDED' })
  })

  it('tidak mengubah stok saat item ditandai rusak', async () => {
    const deps = buildDependencies()

    await deps.service.create(
      baseInput({ items: [{ transaction_item_id: 'item-1', quantity: 1, action: 'DAMAGED' }] }),
      cashierActor,
    )

    expect(deps.updateStock).not.toHaveBeenCalled()
    expect(deps.createMovement).not.toHaveBeenCalled()
  })

  it('tidak memotong kas untuk refund non-tunai', async () => {
    const deps = buildDependencies()

    await deps.service.create(baseInput({ refund_method: 'QRIS' }), cashierActor)

    expect(deps.createCashMovement).not.toHaveBeenCalled()
    expect(deps.createReturn).toHaveBeenCalledWith(
      expect.objectContaining({ shiftId: null, refundMethod: 'QRIS' }),
      expect.anything(),
    )
  })

  it('menolak transaksi kasir lain bila aktor tidak boleh membaca semua', async () => {
    const deps = buildDependencies({
      transaction: buildTransaction({ cashierId: 'cashier-2' }),
    })

    await expect(deps.service.create(baseInput(), cashierActor)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    })
  })

  it('mengizinkan admin meretur transaksi kasir lain', async () => {
    const deps = buildDependencies({
      transaction: buildTransaction({ cashierId: 'cashier-2' }),
    })

    await expect(deps.service.create(baseInput(), adminActor)).resolves.toMatchObject({
      return_number: 'RET-20261106-ABC123',
    })
  })

  it('menolak transaksi yang tidak selesai', async () => {
    const deps = buildDependencies({
      transaction: buildTransaction({ status: 'CANCELLED' }),
    })

    await expect(deps.service.create(baseInput(), cashierActor)).rejects.toMatchObject({
      code: 'TRANSACTION_NOT_RETURNABLE',
    })
  })
})

describe('ReturnService.list', () => {
  it('membatasi daftar pada kasir sendiri bila tanpa akses baca semua', async () => {
    let captured: { cashierId?: string | undefined } | undefined
    const returnRepository: ReturnRepository = {
      create: async () => buildReturnView(),
      findById: async () => null,
      list: async (input) => {
        captured = input
        return { items: [buildReturnView()], total: 1 }
      },
      sumReturnedQuantities: async () => new Map(),
    }

    const service = createReturnService({
      returnRepository,
      transactionRepository: {} as TransactionRepository,
      productRepository: {} as ProductRepository,
      stockMovementRepository: {} as StockMovementRepository,
    })

    const result = await service.list({ page: 1, limit: 10 }, cashierActor)

    expect(captured?.cashierId).toBe('cashier-1')
    expect(result.items).toHaveLength(1)
    expect(result.meta.total_items).toBe(1)
  })
})