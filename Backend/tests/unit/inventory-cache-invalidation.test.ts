import { Prisma } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const hoisted = vi.hoisted(() => ({ events: [] as string[] }))

vi.mock('../../src/config/database.js', () => ({
  runInTransaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
    const result = await fn({})
    hoisted.events.push('commit')
    return result
  },
}))

const { createInventoryService } = await import('../../src/services/inventory.service.js')
const { createPurchaseService } = await import('../../src/services/purchase.service.js')
const { createReturnService } = await import('../../src/services/return.service.js')
const { createStockOpnameService } = await import('../../src/services/stock-opname.service.js')

import type { CacheService } from '../../src/cache/cache.service.js'
import type { InventoryActor } from '../../src/services/inventory.service.js'
import type { OpnameActor } from '../../src/services/stock-opname.service.js'
import type { PurchaseActor } from '../../src/services/purchase.service.js'
import type { ReturnActor } from '../../src/services/return.service.js'
import type { InventoryRepository } from '../../src/repositories/inventory.repository.js'
import type { ProductRepository } from '../../src/repositories/product.repository.js'
import type { PurchaseOrderRepository } from '../../src/repositories/purchase.repository.js'
import type { ReturnRepository } from '../../src/repositories/return.repository.js'
import type { StockMovementRepository } from '../../src/repositories/stock-movement.repository.js'
import type { StockOpnameRepository } from '../../src/repositories/stock-opname.repository.js'
import type { TransactionRepository } from '../../src/repositories/transaction.repository.js'

const buildCache = (): CacheService => {
  const bumpVersion = vi.fn(async (namespace: string) => {
    hoisted.events.push(`bump:${namespace}`)
  })

  return { bumpVersion } as unknown as CacheService
}

const asRepo = <T>(value: Record<string, unknown>): T => value as unknown as T

const adminInventory: InventoryActor = { id: 'admin-1', name: 'Admin', canViewCostPrice: true }
const adminPurchase: PurchaseActor = { id: 'admin-1' }
const cashierReturn: ReturnActor = { id: 'cashier-1', name: 'Kasir', canReadAll: true }
const approver: OpnameActor = { id: 'approver-1' }

beforeEach(() => {
  hoisted.events.length = 0
})

describe('invalidasi inventory dari penyesuaian stok manual', () => {
  it('adjust menaikkan versi inventory setelah transaksi commit', async () => {
    const service = createInventoryService({
      inventoryRepository: asRepo<InventoryRepository>({}),
      productRepository: asRepo<ProductRepository>({
        findByIdForUpdate: async () => ({ id: 'p1', sku: 'SKU-1', name: 'Produk', stock: 5, isActive: true }),
        updateStock: async () => ({ id: 'p1', sku: 'SKU-1', stock: 7 }),
      }),
      stockMovementRepository: asRepo<StockMovementRepository>({
        create: async () => ({
          id: 'm1',
          movementType: 'ADJUSTMENT',
          quantity: 2,
          stockBefore: 5,
          stockAfter: 7,
          referenceType: 'MANUAL',
          referenceId: null,
          notes: null,
          createdAt: new Date('2026-01-01T00:00:00Z'),
        }),
      }),
      cache: buildCache(),
    })

    await service.adjust(
      { product_id: 'p1', movement_type: 'ADJUSTMENT', quantity: 2, notes: 'koreksi' },
      adminInventory,
    )

    expect(hoisted.events).toEqual(['commit', 'bump:inventory'])
  })
})

describe('invalidasi inventory dari penerimaan pembelian', () => {
  const buildOrder = (status: 'ORDERED' | 'RECEIVED') =>
    ({
      id: 'po1',
      poNumber: 'PO-1',
      status,
      totalAmount: new Prisma.Decimal('2400.00'),
      notes: null,
      supplier: { id: 's1', name: 'Supplier' },
      createdBy: { id: 'admin-1', name: 'Admin' },
      items: [
        {
          id: 'poi1',
          productId: 'p1',
          productName: 'Produk',
          quantity: 2,
          costPrice: new Prisma.Decimal('1200.00'),
          subtotal: new Prisma.Decimal('2400.00'),
          product: { id: 'p1', sku: 'SKU-1', name: 'Produk' },
        },
      ],
      orderedAt: null,
      receivedAt: status === 'RECEIVED' ? new Date('2026-01-02T00:00:00Z') : null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-02T00:00:00Z'),
    })

  it('receive menginvalidasi inventory dan products setelah commit', async () => {
    const service = createPurchaseService({
      purchaseOrderRepository: asRepo<PurchaseOrderRepository>({
        findByIdForUpdate: async () => buildOrder('ORDERED'),
        updateStatus: async () => buildOrder('RECEIVED'),
      }),
      supplierRepository: asRepo({}),
      productRepository: asRepo<ProductRepository>({
        findManyByIdsForUpdate: async () => [
          {
            id: 'p1',
            stock: 5,
            costPrice: new Prisma.Decimal('1000.00'),
            averageCost: new Prisma.Decimal('1000.00'),
            sellingPrice: new Prisma.Decimal('1500.00'),
          },
        ],
        update: async () => ({ id: 'p1' }),
        updateStock: async () => ({ id: 'p1' }),
      }),
      stockMovementRepository: asRepo<StockMovementRepository>({ create: async () => ({}) }),
      cache: buildCache(),
    })

    await service.receive('po1', adminPurchase)

    expect(hoisted.events).toEqual(['commit', 'bump:inventory', 'bump:products'])
  })
})

describe('invalidasi inventory dari approval opname', () => {
  const session = (physicalStock: number) => ({
    id: 'op1',
    sessionNumber: 'OP-1',
    name: 'Opname',
    status: 'SUBMITTED',
    scope: 'ALL',
    notes: null,
    rejectionReason: null,
    createdBy: { id: 'creator-1', name: 'Pembuat' },
    approvedBy: null,
    submittedAt: new Date('2026-01-02T00:00:00Z'),
    approvedAt: null,
    rejectedAt: null,
    completedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    items: [
      {
        id: 'oi1',
        productId: 'p1',
        skuSnapshot: 'SKU-1',
        barcodeSnapshot: null,
        nameSnapshot: 'Produk',
        systemStock: 5,
        physicalStock,
        difference: physicalStock - 5,
        reason: null,
        countedBy: null,
        countedAt: new Date('2026-01-02T00:00:00Z'),
      },
    ],
  })

  const buildService = (physicalStock: number) =>
    createStockOpnameService({
      stockOpnameRepository: asRepo<StockOpnameRepository>({
        findByIdForUpdate: async () => session(physicalStock),
        findById: async () => session(physicalStock),
        updateSession: async () => session(physicalStock),
      }),
      productRepository: asRepo<ProductRepository>({
        findManyByIdsForUpdate: async () => [{ id: 'p1', stock: 5 }],
        updateStock: async () => ({ id: 'p1' }),
      }),
      stockMovementRepository: asRepo<StockMovementRepository>({ create: async () => ({}) }),
      cache: buildCache(),
    })

  it('approve dengan selisih stok menginvalidasi inventory', async () => {
    await buildService(7).approve('op1', approver)

    expect(hoisted.events).toEqual(['commit', 'bump:inventory'])
  })

  it('approve tanpa selisih stok tidak menginvalidasi', async () => {
    await buildService(5).approve('op1', approver)

    expect(hoisted.events).toEqual(['commit'])
  })
})

describe('invalidasi inventory dari retur', () => {
  const buildService = (action: 'RESTOCK' | 'DAMAGED') =>
    createReturnService({
      returnRepository: asRepo<ReturnRepository>({
        sumReturnedQuantities: async () => new Map(),
        sumRefundedAmount: async () => 0,
        create: async () => ({
          id: 'r1',
          returnNumber: 'RET-1',
          status: 'COMPLETED',
          reason: 'rusak',
          refundAmount: new Prisma.Decimal('750.00'),
          refundMethod: 'CASH',
          cashier: { id: 'cashier-1', name: 'Kasir' },
          transaction: { id: 't1', invoiceNumber: 'INV-1' },
          items: [
            {
              id: 'ri1',
              transactionItemId: 'ti1',
              productId: 'p1',
              quantity: 1,
              unitPrice: new Prisma.Decimal('750.00'),
              subtotal: new Prisma.Decimal('750.00'),
              action,
              product: { id: 'p1', name: 'Produk', sku: 'SKU-1' },
            },
          ],
          createdAt: new Date('2026-01-01T00:00:00Z'),
        }),
      }),
      transactionRepository: asRepo<TransactionRepository>({
        findDetailByIdForUpdate: async () => ({
          id: 't1',
          cashierId: 'cashier-1',
          status: 'COMPLETED',
          paymentMethod: 'CASH',
          subtotal: '1500.00',
          totalAmount: '1500.00',
          items: [
            {
              id: 'ti1',
              productId: 'p1',
              quantity: 2,
              subtotal: new Prisma.Decimal('1500.00'),
              unitPrice: new Prisma.Decimal('750.00'),
              productNameSnapshot: 'Produk',
            },
          ],
        }),
      }),
      productRepository: asRepo<ProductRepository>({
        findManyByIdsForUpdate: async () => [{ id: 'p1', stock: 5 }],
        updateStock: async () => ({ id: 'p1' }),
      }),
      stockMovementRepository: asRepo<StockMovementRepository>({ create: async () => ({}) }),
      cache: buildCache(),
    })

  const input = (action: 'RESTOCK' | 'DAMAGED') => ({
    transaction_id: 't1',
    reason: 'rusak',
    refund_method: 'CASH' as const,
    items: [{ transaction_item_id: 'ti1', quantity: 1, action }],
  })

  it('retur RESTOCK menginvalidasi inventory', async () => {
    await buildService('RESTOCK').create(input('RESTOCK'), cashierReturn)

    expect(hoisted.events).toEqual(['commit', 'bump:inventory'])
  })

  it('retur tanpa RESTOCK tidak menginvalidasi inventory', async () => {
    await buildService('DAMAGED').create(input('DAMAGED'), cashierReturn)

    expect(hoisted.events).toEqual(['commit'])
  })
})
