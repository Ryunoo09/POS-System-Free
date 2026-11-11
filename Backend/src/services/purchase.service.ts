import { runInTransaction } from '../config/database.js'
import type { PurchaseOrderStatus } from '../constants/purchasing.js'
import { BusinessRuleError, NotFoundError } from '../errors/app-errors.js'
import { toPurchaseOrderDto, type PurchaseOrderDto } from '../mappers/purchase.mapper.js'
import type { ProductRepository } from '../repositories/product.repository.js'
import type {
  CreatePurchaseOrderItemData,
  PurchaseOrderRepository,
} from '../repositories/purchase.repository.js'
import type { SupplierRepository } from '../repositories/supplier.repository.js'
import type { StockMovementRepository } from '../repositories/stock-movement.repository.js'
import type { AuditRecorder } from './audit.service.js'
import type { PriceService } from './price.service.js'
import type { FieldError, PaginationMeta } from '../types/http.js'
import { buildPaginationMeta, toSkip } from '../utils/pagination.js'
import { fromMinor as moneyFromMinor, toMinor as moneyToMinor } from '../utils/pricing.js'
import { formatPurchaseOrderNumber } from '../utils/purchase-number.js'
import type {
  CreatePurchaseOrderInput,
  ListPurchaseOrdersQuery,
} from '../validators/purchase.validator.js'

export interface PurchaseActor {
  id: string
  ipAddress?: string | null
  userAgent?: string | null
}

export interface PurchaseService {
  list: (
    query: ListPurchaseOrdersQuery,
  ) => Promise<{ items: PurchaseOrderDto[]; meta: PaginationMeta }>
  detail: (id: string) => Promise<PurchaseOrderDto>
  create: (input: CreatePurchaseOrderInput, actor: PurchaseActor) => Promise<PurchaseOrderDto>
  order: (id: string, actor: PurchaseActor) => Promise<PurchaseOrderDto>
  receive: (id: string, actor: PurchaseActor) => Promise<PurchaseOrderDto>
  cancel: (id: string, actor: PurchaseActor) => Promise<PurchaseOrderDto>
}

const toMinor = (value: number): number => Math.round(value * 100)

const assertStatus = (
  current: PurchaseOrderStatus,
  allowed: readonly PurchaseOrderStatus[],
  action: string,
): void => {
  if (!allowed.includes(current)) {
    throw new BusinessRuleError(
      `Purchase order berstatus ${current} tidak dapat ${action}`,
      'INVALID_PO_STATUS',
    )
  }
}

export const createPurchaseService = ({
  purchaseOrderRepository,
  supplierRepository,
  productRepository,
  stockMovementRepository,
  priceService,
  audit,
}: {
  purchaseOrderRepository: PurchaseOrderRepository
  supplierRepository: SupplierRepository
  productRepository: ProductRepository
  stockMovementRepository: StockMovementRepository
  priceService?: PriceService
  audit?: AuditRecorder
}): PurchaseService => {
  const findOrFail = async (id: string) => {
    const order = await purchaseOrderRepository.findById(id)

    if (!order) {
      throw new NotFoundError('Purchase order tidak ditemukan', 'NOT_FOUND')
    }

    return order
  }

  const recordAudit = (
    actor: PurchaseActor,
    id: string,
    oldValue: unknown,
    newValue: unknown,
  ): Promise<void> | undefined =>
    audit?.record({
      userId: actor.id,
      action: 'UPDATE',
      entity: 'PURCHASE_ORDER',
      entityId: id,
      oldValue,
      newValue,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    })

  return {
    list: async (query) => {
      const { items, total } = await purchaseOrderRepository.list({
        skip: toSkip(query.page, query.limit),
        take: query.limit,
        status: query.status,
        supplierId: query.supplier_id,
        search: query.search,
      })

      return {
        items: items.map(toPurchaseOrderDto),
        meta: buildPaginationMeta(query.page, query.limit, total),
      }
    },

    detail: async (id) => toPurchaseOrderDto(await findOrFail(id)),

    create: async (input, actor) => {
      const supplier = await supplierRepository.findById(input.supplier_id)

      if (!supplier) {
        throw new NotFoundError('Supplier tidak ditemukan', 'NOT_FOUND')
      }

      if (!supplier.isActive) {
        throw new BusinessRuleError('Supplier nonaktif tidak dapat dipakai', 'SUPPLIER_INACTIVE', [
          { field: 'supplier_id', message: 'Supplier nonaktif' },
        ])
      }

      const created = await runInTransaction(async (tx) => {
        const productIds = input.items.map((item) => item.product_id).sort()
        const products = await productRepository.findManyByIdsForUpdate(productIds, tx)
        const productById = new Map(products.map((product) => [product.id, product]))

        const missing: FieldError[] = input.items.flatMap((item, index) =>
          productById.has(item.product_id)
            ? []
            : [{ field: `items[${index}].product_id`, message: 'Produk tidak ditemukan' }],
        )

        if (missing.length > 0) {
          throw new BusinessRuleError('Item pembelian tidak valid', 'INVALID_PURCHASE_ITEM', missing)
        }

        let totalMinor = 0
        const items: CreatePurchaseOrderItemData[] = input.items.map((item) => {
          const product = productById.get(item.product_id)!
          const lineMinor = toMinor(item.cost_price) * item.quantity
          totalMinor += lineMinor

          return {
            productId: product.id,
            productName: product.name,
            quantity: item.quantity,
            costPrice: item.cost_price.toFixed(2),
            subtotal: (lineMinor / 100).toFixed(2),
          }
        })

        return purchaseOrderRepository.create(
          {
            poNumber: formatPurchaseOrderNumber(),
            supplierId: supplier.id,
            totalAmount: (totalMinor / 100).toFixed(2),
            notes: input.notes?.trim() || null,
            createdById: actor.id,
            items,
          },
          tx,
        )
      })

      await audit?.record({
        userId: actor.id,
        action: 'CREATE',
        entity: 'PURCHASE_ORDER',
        entityId: created.id,
        newValue: {
          po_number: created.poNumber,
          supplier_id: created.supplierId,
          total_amount: created.totalAmount.toFixed(2),
        },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      })

      return toPurchaseOrderDto(created)
    },

    order: async (id, actor) => {
      const existing = await findOrFail(id)
      assertStatus(existing.status, ['DRAFT'], 'diproses')

      const updated = await purchaseOrderRepository.updateStatus(id, {
        status: 'ORDERED',
        orderedAt: new Date(),
      })

      await recordAudit(actor, id, { status: existing.status }, { status: updated.status })

      return toPurchaseOrderDto(updated)
    },

    receive: async (id, actor) => {
      const existing = await findOrFail(id)
      assertStatus(existing.status, ['DRAFT', 'ORDERED'], 'diterima')

      const received = await runInTransaction(async (tx) => {
        const productIds = [...new Set(existing.items.map((item) => item.productId))].sort()
        const products = await productRepository.findManyByIdsForUpdate(productIds, tx)
        const productById = new Map(products.map((product) => [product.id, product]))

        if (existing.items.some((item) => !productById.has(item.productId))) {
          throw new NotFoundError('Produk tidak ditemukan', 'NOT_FOUND')
        }

        for (const item of existing.items) {
          const product = productById.get(item.productId)!
          const stockAfter = product.stock + item.quantity
          const costBefore = product.costPrice.toFixed(2)
          const averageBefore = product.averageCost.toFixed(2)
          const costAfter = item.costPrice.toFixed(2)
          const weightedStock = Math.max(product.stock, 0)
          const totalStock = weightedStock + item.quantity
          const averageAfter =
            totalStock > 0
              ? moneyFromMinor(
                  Math.round(
                    (weightedStock * moneyToMinor(averageBefore) +
                      item.quantity * moneyToMinor(costAfter)) /
                      totalStock,
                  ),
                )
              : costAfter

          await productRepository.updateStock(product.id, stockAfter, tx)
          await productRepository.update(
            product.id,
            { costPrice: costAfter, averageCost: averageAfter },
            tx,
          )
          await priceService?.recordPriceChanges({
            productId: product.id,
            before: {
              sellingPrice: product.sellingPrice.toFixed(2),
              costPrice: costBefore,
              averageCost: averageBefore,
            },
            after: {
              sellingPrice: product.sellingPrice.toFixed(2),
              costPrice: costAfter,
              averageCost: averageAfter,
            },
            source: 'PURCHASE',
            reason: `Pembelian ${existing.poNumber}`,
            changedById: actor.id,
            purchaseOrderId: existing.id,
            tx,
          })
          await stockMovementRepository.create(
            {
              productId: product.id,
              movementType: 'PURCHASE',
              quantity: item.quantity,
              stockBefore: product.stock,
              stockAfter,
              referenceType: 'PURCHASE',
              referenceId: existing.id,
              notes: `Pembelian ${existing.poNumber}`,
              createdById: actor.id,
            },
            tx,
          )
        }

        return purchaseOrderRepository.updateStatus(
          existing.id,
          { status: 'RECEIVED', receivedAt: new Date() },
          tx,
        )
      })

      await recordAudit(
        actor,
        id,
        { status: existing.status },
        {
          status: received.status,
          items: received.items.map((item) => ({
            product_id: item.productId,
            quantity: item.quantity,
          })),
        },
      )

      return toPurchaseOrderDto(received)
    },

    cancel: async (id, actor) => {
      const existing = await findOrFail(id)
      assertStatus(existing.status, ['DRAFT', 'ORDERED'], 'dibatalkan')

      const updated = await purchaseOrderRepository.updateStatus(id, { status: 'CANCELLED' })

      await recordAudit(actor, id, { status: existing.status }, { status: updated.status })

      return toPurchaseOrderDto(updated)
    },
  }
}