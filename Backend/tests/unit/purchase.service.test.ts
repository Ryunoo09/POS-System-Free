import { Prisma } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import type { ProductRepository, ProductView } from '../../src/repositories/product.repository.js'
import type {
  PurchaseOrderRepository,
  PurchaseOrderView,
} from '../../src/repositories/purchase.repository.js'
import type { SupplierRepository } from '../../src/repositories/supplier.repository.js'
import type { StockMovementRepository } from '../../src/repositories/stock-movement.repository.js'
import { createPurchaseService, type PurchaseActor } from '../../src/services/purchase.service.js'
import type { PriceService } from '../../src/services/price.service.js'
import type { CreatePurchaseOrderInput } from '../../src/validators/purchase.validator.js'

vi.mock('../../src/config/database.js', () => ({
  runInTransaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn({}),
}))

const actor: PurchaseActor = { id: 'admin-1' }

const buildProduct = (overrides: Partial<ProductView> = {}): ProductView => ({
  id: 'product-1',
  sku: 'MKN-001',
  barcode: null,
  name: 'Kopi Susu',
  description: null,
  categoryId: 'category-1',
  unit: 'pcs',
  costPrice: new Prisma.Decimal('2000.00'),
  averageCost: new Prisma.Decimal('2000.00'),
  sellingPrice: new Prisma.Decimal('3500.00'),
  stock: 10,
  minStock: 2,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  category: { id: 'category-1', name: 'Minuman' },
  ...overrides,
})

const buildOrder = (overrides: Partial<PurchaseOrderView> = {}): PurchaseOrderView => ({
  id: 'po-1',
  poNumber: 'PO-20261110-ABC123',
  supplierId: 'supplier-1',
  status: 'DRAFT',
  totalAmount: new Prisma.Decimal('40000.00'),
  notes: null,
  orderedAt: null,
  receivedAt: null,
  createdById: 'admin-1',
  createdAt: new Date('2026-11-10T03:00:00Z'),
  updatedAt: new Date('2026-11-10T03:00:00Z'),
  supplier: { id: 'supplier-1', name: 'PT Sumber Kopi' },
  createdBy: { id: 'admin-1', name: 'Admin' },
  items: [
    {
      id: 'poi-1',
      purchaseOrderId: 'po-1',
      productId: 'product-1',
      productName: 'Kopi Susu',
      quantity: 20,
      costPrice: new Prisma.Decimal('2000.00'),
      subtotal: new Prisma.Decimal('40000.00'),
      product: { id: 'product-1', sku: 'MKN-001', name: 'Kopi Susu' },
    },
  ],
  ...overrides,
})

const buildDependencies = (options: {
  order?: PurchaseOrderView
  supplierActive?: boolean
  product?: ProductView
} = {}) => {
  const updateStock = vi.fn(async (_id: string, stock: number) => buildProduct({ stock }))
  const updateProduct = vi.fn(async () => buildProduct())
  const createMovement = vi.fn(async () => undefined)
  const recordPriceChanges = vi.fn(async () => {})
  const priceService = { recordPriceChanges } as unknown as PriceService

  const createOrder = vi.fn(async () => buildOrder())
  const updateStatus = vi.fn(async (_id: string, data: { status: string }) =>
    buildOrder({
      status: data.status as PurchaseOrderView['status'],
      receivedAt: data.status === 'RECEIVED' ? new Date('2026-11-10T04:00:00Z') : null,
    }),
  )

  const purchaseOrderRepository = {
    create: createOrder,
    findById: async () => options.order ?? buildOrder(),
    list: async () => ({ items: [], total: 0 }),
    updateStatus,
  } as unknown as PurchaseOrderRepository

  const supplierRepository = {
    findById: async () => ({
      id: 'supplier-1',
      name: 'PT Sumber Kopi',
      isActive: options.supplierActive ?? true,
    }),
    countPurchaseOrders: async () => 0,
  } as unknown as SupplierRepository

  const productRepository = {
    findManyByIdsForUpdate: async () => [options.product ?? buildProduct()],
    updateStock,
    update: updateProduct,
  } as unknown as ProductRepository

  const stockMovementRepository = {
    create: createMovement,
  } as unknown as StockMovementRepository

  const record = vi.fn(async () => {})

  const service = createPurchaseService({
    purchaseOrderRepository,
    supplierRepository,
    productRepository,
    stockMovementRepository,
    priceService,
    audit: { record },
  })

  return {
    service,
    createOrder,
    updateStatus,
    updateStock,
    updateProduct,
    createMovement,
    record,
    recordPriceChanges,
  }
}

const baseInput = (overrides: Partial<CreatePurchaseOrderInput> = {}): CreatePurchaseOrderInput => ({
  supplier_id: 'supplier-1',
  items: [{ product_id: 'product-1', quantity: 20, cost_price: 2000 }],
  ...overrides,
})

describe('PurchaseService.create', () => {
  it('menghitung total dan membuat PO berstatus DRAFT', async () => {
    const deps = buildDependencies()

    const result = await deps.service.create(baseInput(), actor)

    expect(deps.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        supplierId: 'supplier-1',
        totalAmount: '40000.00',
        createdById: 'admin-1',
        items: [
          expect.objectContaining({
            productId: 'product-1',
            productName: 'Kopi Susu',
            quantity: 20,
            costPrice: '2000.00',
            subtotal: '40000.00',
          }),
        ],
      }),
      expect.anything(),
    )
    expect(deps.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', entity: 'PURCHASE_ORDER', entityId: 'po-1' }),
    )
    expect(result.po_number).toBe('PO-20261110-ABC123')
  })

  it('menolak supplier nonaktif', async () => {
    const deps = buildDependencies({ supplierActive: false })

    await expect(deps.service.create(baseInput(), actor)).rejects.toMatchObject({
      code: 'SUPPLIER_INACTIVE',
    })
    expect(deps.createOrder).not.toHaveBeenCalled()
  })
})

describe('PurchaseService.receive', () => {
  it('menambah stok, memperbarui harga beli, dan membuat stock movement PURCHASE', async () => {
    const deps = buildDependencies()

    const result = await deps.service.receive('po-1', actor)

    expect(deps.updateStock).toHaveBeenCalledWith('product-1', 30, expect.anything())
    expect(deps.updateProduct).toHaveBeenCalledWith(
      'product-1',
      { costPrice: '2000.00', averageCost: '2000.00' },
      expect.anything(),
    )
    expect(deps.recordPriceChanges).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'product-1',
        source: 'PURCHASE',
        purchaseOrderId: 'po-1',
        before: expect.objectContaining({ averageCost: '2000.00' }),
        after: expect.objectContaining({ averageCost: '2000.00', costPrice: '2000.00' }),
      }),
    )
    expect(deps.createMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        movementType: 'PURCHASE',
        quantity: 20,
        stockBefore: 10,
        stockAfter: 30,
        referenceType: 'PURCHASE',
        referenceId: 'po-1',
      }),
      expect.anything(),
    )
    expect(deps.updateStatus).toHaveBeenCalledWith(
      'po-1',
      expect.objectContaining({ status: 'RECEIVED' }),
      expect.anything(),
    )
    expect(result.status).toBe('RECEIVED')
  })

  it('menghitung rata-rata bergerak tertimbang saat harga beli berbeda', async () => {
    const deps = buildDependencies({
      product: buildProduct({ averageCost: new Prisma.Decimal('3000.00') }),
    })

    await deps.service.receive('po-1', actor)

    expect(deps.updateProduct).toHaveBeenCalledWith(
      'product-1',
      { costPrice: '2000.00', averageCost: '2333.33' },
      expect.anything(),
    )
    expect(deps.recordPriceChanges).toHaveBeenCalledWith(
      expect.objectContaining({
        before: expect.objectContaining({ averageCost: '3000.00' }),
        after: expect.objectContaining({ averageCost: '2333.33' }),
      }),
    )
  })

  it('menolak penerimaan PO yang sudah dibatalkan', async () => {
    const deps = buildDependencies({ order: buildOrder({ status: 'CANCELLED' }) })

    await expect(deps.service.receive('po-1', actor)).rejects.toMatchObject({
      code: 'INVALID_PO_STATUS',
    })
    expect(deps.updateStock).not.toHaveBeenCalled()
  })
})

describe('PurchaseService.cancel', () => {
  it('membatalkan PO yang belum diterima', async () => {
    const deps = buildDependencies()

    const result = await deps.service.cancel('po-1', actor)

    expect(deps.updateStatus).toHaveBeenCalledWith('po-1', { status: 'CANCELLED' })
    expect(result.status).toBe('CANCELLED')
  })
})