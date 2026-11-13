import { runInTransaction } from '../config/database.js'
import { noopCache, type CacheService } from '../cache/cache.service.js'
import { BusinessRuleError, ConflictError, NotFoundError } from '../errors/app-errors.js'
import {
  toTransactionDetailDto,
  toTransactionDto,
  type TransactionDetailDto,
  type TransactionDto,
} from '../mappers/transaction.mapper.js'
import type { ProductRepository } from '../repositories/product.repository.js'
import type {
  CashierOption,
  CreateCheckoutData,
  TransactionDetailView,
  TransactionRepository,
} from '../repositories/transaction.repository.js'
import type { StockMovementRepository } from '../repositories/stock-movement.repository.js'
import type { ShiftRepository } from '../repositories/shift.repository.js'
import type { PriceService } from './price.service.js'
import type { FieldError, PaginationMeta } from '../types/http.js'
import { resolveDateRange } from '../utils/date-range.js'
import { isUniqueViolation } from '../utils/idempotency.js'
import { formatInvoiceNumber } from '../utils/invoice.js'
import { buildPaginationMeta, toSkip } from '../utils/pagination.js'
import { calculateChange, calculateTotals } from '../utils/pricing.js'
import type { CheckoutInput, ListTransactionsQuery } from '../validators/transaction.validator.js'

export interface TransactionActor {
  userId: string
  canReadAll: boolean
  canViewCostPrice: boolean
}

export interface CheckoutActor {
  id: string
  name: string
  canViewCostPrice: boolean
}

export interface CheckoutResult {
  transaction: TransactionDetailDto
  replayed: boolean
}

export interface TransactionService {
  list: (
    query: ListTransactionsQuery,
    actor: TransactionActor,
  ) => Promise<{ items: TransactionDto[]; meta: PaginationMeta }>
  detail: (id: string, actor: TransactionActor) => Promise<TransactionDetailDto>
  cashiers: () => Promise<CashierOption[]>
  checkout: (
    input: CheckoutInput,
    actor: CheckoutActor,
    idempotencyKey: string,
  ) => Promise<CheckoutResult>
}

const amountToMinor = (value: number): number => Math.round(value * 100)

const replayOrConflict = (
  transaction: TransactionDetailView,
  actor: CheckoutActor,
): CheckoutResult => {
  if (transaction.cashierId !== actor.id) {
    throw new ConflictError(
      'Idempotency-Key sudah digunakan kasir lain',
      'IDEMPOTENCY_KEY_CONFLICT',
    )
  }

  return {
    transaction: toTransactionDetailDto(transaction, {
      canViewCostPrice: actor.canViewCostPrice,
    }),
    replayed: true,
  }
}

export const createTransactionService = ({
  transactionRepository,
  productRepository,
  stockMovementRepository,
  shiftRepository,
  priceService,
  taxRate,
  cache = noopCache,
}: {
  transactionRepository: TransactionRepository
  productRepository: ProductRepository
  stockMovementRepository: StockMovementRepository
  shiftRepository?: ShiftRepository
  priceService: PriceService
  taxRate: number
  cache?: CacheService
}): TransactionService => ({
  list: async (query, actor) => {
    const range =
      query.start_date !== undefined || query.end_date !== undefined
        ? resolveDateRange({ start_date: query.start_date, end_date: query.end_date })
        : null

    const { items, total } = await transactionRepository.list({
      skip: toSkip(query.page, query.limit),
      take: query.limit,
      status: query.status,
      cashierId: actor.canReadAll ? query.cashier_id : actor.userId,
      paymentMethod: query.payment_method,
      search: query.search,
      startAt: range?.startAt,
      endAt: range?.endAt,
    })

    return {
      items: items.map(toTransactionDto),
      meta: buildPaginationMeta(query.page, query.limit, total),
    }
  },

  detail: async (id, actor) => {
    const transaction = await transactionRepository.findDetailById(id)

    if (!transaction || (!actor.canReadAll && transaction.cashierId !== actor.userId)) {
      throw new NotFoundError('Transaksi tidak ditemukan', 'NOT_FOUND')
    }

    return toTransactionDetailDto(transaction, {
      canViewCostPrice: actor.canViewCostPrice,
    })
  },

  cashiers: () => transactionRepository.listCashiers(),

  checkout: async (input, actor, idempotencyKey) => {
    const existing = await transactionRepository.findByIdempotencyKey(idempotencyKey)
    if (existing) return replayOrConflict(existing, actor)

    // Nomor invoice & shift aktif diambil sebelum transaksi agar antrean lock produk tetap singkat.
    const invoiceNumber = formatInvoiceNumber(await transactionRepository.nextInvoiceSequence())
    const activeShift = shiftRepository ? await shiftRepository.findActiveByCashierId(actor.id) : null
    const activeShiftId = activeShift ? activeShift.id : null

    try {
      let appliedScheduledPrices = 0

      const created = await runInTransaction(async (tx) => {
        const productIds = [...new Set(input.items.map((item) => item.product_id))].sort()
        appliedScheduledPrices = await priceService.applyDueScheduledPrices(tx, productIds)
        const products = await productRepository.findManyByIdsForUpdate(productIds, tx)
        const productById = new Map(products.map((product) => [product.id, product]))

        if (input.items.some((item) => !productById.has(item.product_id))) {
          throw new NotFoundError('Produk tidak ditemukan', 'NOT_FOUND')
        }

        const collectErrors = (check: (index: number) => string | null): FieldError[] =>
          input.items.flatMap((_, index) => {
            const message = check(index)
            return message ? [{ field: `items[${index}].quantity`, message }] : []
          })

        const inactiveErrors = collectErrors((index) => {
          const product = productById.get(input.items[index]!.product_id)!
          return product.isActive ? null : `${product.name}: produk nonaktif`
        })

        if (inactiveErrors.length > 0) {
          throw new BusinessRuleError('Produk nonaktif tidak dapat dijual', 'PRODUCT_INACTIVE', inactiveErrors)
        }

        const stockErrors = collectErrors((index) => {
          const item = input.items[index]!
          const product = productById.get(item.product_id)!
          return product.stock < item.quantity
            ? `${product.name}: diminta ${item.quantity}, tersedia ${product.stock}`
            : null
        })

        if (stockErrors.length > 0) {
          throw new BusinessRuleError('Stok tidak mencukupi', 'INSUFFICIENT_STOCK', stockErrors)
        }

        const itemDiscountErrors = input.items.flatMap((item, index) => {
          const product = productById.get(item.product_id)!
          const discount = amountToMinor(item.discount_amount ?? 0)
          const line = amountToMinor(Number(product.sellingPrice) * item.quantity)

          return discount > line
            ? [
                {
                  field: `items[${index}].discount_amount`,
                  message: 'Diskon item melebihi harga',
                },
              ]
            : []
        })

        if (itemDiscountErrors.length > 0) {
          throw new BusinessRuleError('Diskon item tidak valid', 'INVALID_ITEM_DISCOUNT', itemDiscountErrors)
        }

        const totals = calculateTotals({
          items: input.items.map((item) => {
            const product = productById.get(item.product_id)!
            const unitCost = product.averageCost.greaterThan(0)
              ? product.averageCost
              : product.costPrice

            return {
              productId: product.id,
              quantity: item.quantity,
              unitPrice: product.sellingPrice.toFixed(2),
              unitCost: unitCost.toFixed(2),
              discountAmount: (item.discount_amount ?? 0).toFixed(2),
            }
          }),
          discountAmount: input.discount_amount.toFixed(2),
          taxRate,
        })

        if (amountToMinor(input.discount_amount) > amountToMinor(Number(totals.subtotal))) {
          throw new BusinessRuleError('Diskon melebihi subtotal', 'INVALID_DISCOUNT', [
            { field: 'discount_amount', message: 'Diskon melebihi subtotal' },
          ])
        }

        const totalMinor = amountToMinor(Number(totals.totalAmount))
        const paidMinor = amountToMinor(input.payment.amount_paid)

        if (input.payment.method === 'CASH' && paidMinor < totalMinor) {
          throw new BusinessRuleError('Pembayaran kurang dari total', 'INSUFFICIENT_PAYMENT', [
            { field: 'payment.amount_paid', message: 'Jumlah bayar kurang dari total' },
          ])
        }

        if (input.payment.method !== 'CASH' && paidMinor !== totalMinor) {
          throw new BusinessRuleError(
            'Jumlah pembayaran non-tunai harus sama dengan total',
            'INVALID_PAYMENT_AMOUNT',
            [{ field: 'payment.amount_paid', message: 'Jumlah bayar harus sama dengan total' }],
          )
        }

        const checkoutData: CreateCheckoutData = {
          invoiceNumber,
          idempotencyKey,
          cashierId: actor.id,
          shiftId: activeShiftId,
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
          paymentMethod: input.payment.method,
          paymentReference: input.payment.reference?.trim() || null,
          amountPaid: input.payment.amount_paid.toFixed(2),
          changeAmount: calculateChange({
            method: input.payment.method,
            total: totals.totalAmount,
            amountPaid: input.payment.amount_paid.toFixed(2),
          }),
          items: totals.items.map((item) => {
            const product = productById.get(item.productId)!
            return {
              productId: product.id,
              productName: product.name,
              productSku: product.sku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              unitCost: item.unitCost,
              discountAmount: item.discountAmount,
              subtotal: item.subtotal,
            }
          }),
        }

        const transaction = await transactionRepository.createCheckout(checkoutData, tx)

        for (const item of input.items) {
          const product = productById.get(item.product_id)!
          const stockAfter = product.stock - item.quantity

          await productRepository.updateStock(product.id, stockAfter, tx)
          await stockMovementRepository.create(
            {
              productId: product.id,
              movementType: 'SALE',
              quantity: -item.quantity,
              stockBefore: product.stock,
              stockAfter,
              referenceType: 'TRANSACTION',
              referenceId: transaction.id,
              notes: null,
              createdById: actor.id,
            },
            tx,
          )
        }

        return transaction
      })

      // Harga terjadwal di dalam checkout hanya mengubah cache setelah transaksi
      // commit; stok juga berubah sehingga namespace inventory ikut di-invalidasi.
      if (appliedScheduledPrices > 0) await cache.bumpVersion('products')
      await cache.bumpVersion('inventory')

      return {
        transaction: toTransactionDetailDto(created, {
          canViewCostPrice: actor.canViewCostPrice,
        }),
        replayed: false,
      }
    } catch (error) {
      if (isUniqueViolation(error)) {
        const existing = await transactionRepository.findByIdempotencyKey(idempotencyKey)
        if (existing) return replayOrConflict(existing, actor)
      }

      throw error
    }
  },
})
