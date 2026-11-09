import { runInTransaction } from '../config/database.js'
import { BusinessRuleError, NotFoundError } from '../errors/app-errors.js'
import { toReturnDto, type ReturnDto } from '../mappers/return.mapper.js'
import type { ProductRepository } from '../repositories/product.repository.js'
import type {
  CreateReturnItemData,
  ReturnRepository,
} from '../repositories/return.repository.js'
import type { ShiftRepository } from '../repositories/shift.repository.js'
import type { StockMovementRepository } from '../repositories/stock-movement.repository.js'
import type { TransactionRepository } from '../repositories/transaction.repository.js'
import type { AuditRecorder } from './audit.service.js'
import type { FieldError, PaginationMeta } from '../types/http.js'
import { resolveDateRange } from '../utils/date-range.js'
import { buildPaginationMeta, toSkip } from '../utils/pagination.js'
import { formatReturnNumber } from '../utils/return-number.js'
import type { CreateReturnInput, ListReturnsQuery } from '../validators/return.validator.js'

export interface ReturnActor {
  id: string
  name: string
  canReadAll: boolean
  ipAddress?: string | null
  userAgent?: string | null
}

export interface ReturnService {
  list: (
    query: ListReturnsQuery,
    actor: ReturnActor,
  ) => Promise<{ items: ReturnDto[]; meta: PaginationMeta }>
  detail: (id: string, actor: ReturnActor) => Promise<ReturnDto>
  create: (input: CreateReturnInput, actor: ReturnActor) => Promise<ReturnDto>
}

const toMinor = (value: number): number => Math.round(value * 100)

export const createReturnService = ({
  returnRepository,
  transactionRepository,
  productRepository,
  stockMovementRepository,
  shiftRepository,
  audit,
}: {
  returnRepository: ReturnRepository
  transactionRepository: TransactionRepository
  productRepository: ProductRepository
  stockMovementRepository: StockMovementRepository
  shiftRepository?: ShiftRepository
  audit?: AuditRecorder
}): ReturnService => ({
  list: async (query, actor) => {
    const range =
      query.start_date !== undefined || query.end_date !== undefined
        ? resolveDateRange({ start_date: query.start_date, end_date: query.end_date })
        : null

    const { items, total } = await returnRepository.list({
      skip: toSkip(query.page, query.limit),
      take: query.limit,
      transactionId: query.transaction_id,
      cashierId: actor.canReadAll ? query.cashier_id : actor.id,
      status: query.status,
      startAt: range?.startAt,
      endAt: range?.endAt,
    })

    return {
      items: items.map(toReturnDto),
      meta: buildPaginationMeta(query.page, query.limit, total),
    }
  },

  detail: async (id, actor) => {
    const record = await returnRepository.findById(id)

    if (!record || (!actor.canReadAll && record.cashierId !== actor.id)) {
      throw new NotFoundError('Retur tidak ditemukan', 'NOT_FOUND')
    }

    return toReturnDto(record)
  },

  create: async (input, actor) => {
    const transaction = await transactionRepository.findDetailById(input.transaction_id)

    if (!transaction || (!actor.canReadAll && transaction.cashierId !== actor.id)) {
      throw new NotFoundError('Transaksi tidak ditemukan', 'NOT_FOUND')
    }

    if (transaction.status !== 'COMPLETED') {
      throw new BusinessRuleError(
        'Transaksi yang tidak selesai tidak dapat diretur',
        'TRANSACTION_NOT_RETURNABLE',
      )
    }

    const itemById = new Map(transaction.items.map((item) => [item.id, item]))

    const unknownItems: FieldError[] = input.items.flatMap((item, index) =>
      itemById.has(item.transaction_item_id)
        ? []
        : [
            {
              field: `items[${index}].transaction_item_id`,
              message: 'Item transaksi tidak ditemukan pada transaksi ini',
            },
          ],
    )

    if (unknownItems.length > 0) {
      throw new BusinessRuleError('Item retur tidak valid', 'INVALID_RETURN_ITEM', unknownItems)
    }

    const returnNumber = formatReturnNumber()

    const created = await runInTransaction(async (tx) => {
      const returnedMap = await returnRepository.sumReturnedQuantities(transaction.id, tx)

      const quantityErrors: FieldError[] = []
      const returnItems: CreateReturnItemData[] = []
      let refundMinor = 0

      input.items.forEach((line, index) => {
        const item = itemById.get(line.transaction_item_id)!
        const alreadyReturned = returnedMap.get(item.id) ?? 0
        const remaining = item.quantity - alreadyReturned

        if (line.quantity > remaining) {
          quantityErrors.push({
            field: `items[${index}].quantity`,
            message: `${item.productNameSnapshot}: maksimal ${remaining} dapat diretur`,
          })
          return
        }

        const lineMinor = toMinor(Number(item.subtotal))
        const lineRefundMinor = Math.round((lineMinor * line.quantity) / item.quantity)
        refundMinor += lineRefundMinor

        returnItems.push({
          transactionItemId: item.id,
          productId: item.productId,
          quantity: line.quantity,
          unitPrice: item.unitPrice.toFixed(2),
          subtotal: (lineRefundMinor / 100).toFixed(2),
          action: line.action,
        })
      })

      if (quantityErrors.length > 0) {
        throw new BusinessRuleError(
          'Kuantitas retur melebihi jumlah pembelian',
          'RETURN_QUANTITY_EXCEEDED',
          quantityErrors,
        )
      }

      const restockItems = returnItems.filter((item) => item.action === 'RESTOCK')
      if (restockItems.length > 0) {
        const productIds = [...new Set(restockItems.map((item) => item.productId))].sort()
        const products = await productRepository.findManyByIdsForUpdate(productIds, tx)
        const productById = new Map(products.map((product) => [product.id, product]))

        if (restockItems.some((item) => !productById.has(item.productId))) {
          throw new NotFoundError('Produk tidak ditemukan', 'NOT_FOUND')
        }

        for (const item of restockItems) {
          const product = productById.get(item.productId)!
          const stockAfter = product.stock + item.quantity

          await productRepository.updateStock(product.id, stockAfter, tx)
          await stockMovementRepository.create(
            {
              productId: product.id,
              movementType: 'RETURN',
              quantity: item.quantity,
              stockBefore: product.stock,
              stockAfter,
              referenceType: 'TRANSACTION',
              referenceId: transaction.id,
              notes: `Retur ${returnNumber}`,
              createdById: actor.id,
            },
            tx,
          )
        }
      }

      let shiftId: string | null = null
      if (shiftRepository && input.refund_method === 'CASH') {
        const activeShift = await shiftRepository.findActiveByCashierId(actor.id)
        shiftId = activeShift?.id ?? null
      }

      const refundAmount = (refundMinor / 100).toFixed(2)

      const record = await returnRepository.create(
        {
          returnNumber,
          transactionId: transaction.id,
          cashierId: actor.id,
          shiftId,
          reason: input.reason,
          refundAmount,
          refundMethod: input.refund_method,
          items: returnItems,
        },
        tx,
      )

      if (shiftId) {
        await shiftRepository!.createCashMovement(
          {
            shiftId,
            type: 'CASH_OUT',
            amount: Number(refundAmount),
            reason: `Refund Retur: ${returnNumber}`,
            createdById: actor.id,
          },
          tx,
        )
      }

      return record
    })

    await audit?.record({
      userId: actor.id,
      action: 'CREATE',
      entity: 'RETURN',
      entityId: created.id,
      newValue: {
        return_number: created.returnNumber,
        transaction_id: created.transactionId,
        refund_amount: created.refundAmount.toFixed(2),
        refund_method: created.refundMethod,
        items: created.items.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
          action: item.action,
        })),
      },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    })

    return toReturnDto(created)
  },
})