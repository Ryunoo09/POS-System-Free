import { Prisma } from '@prisma/client'
import type { PrismaClient, ReturnItem, ReturnTransaction } from '@prisma/client'
import type { PaymentMethod } from '../constants/transactions.js'
import type { ReturnAction, ReturnStatus } from '../constants/returns.js'

export type ReturnView = ReturnTransaction & {
  cashier: { id: string; name: string }
  transaction: { id: string; invoiceNumber: string }
  items: Array<ReturnItem & { product: { id: string; name: string; sku: string } }>
}

export interface ReturnFilters {
  transactionId?: string | undefined
  cashierId?: string | undefined
  status?: ReturnStatus | undefined
  startAt?: Date | undefined
  endAt?: Date | undefined
}

export interface ListReturnsInput extends ReturnFilters {
  skip: number
  take: number
}

export interface CreateReturnItemData {
  transactionItemId: string
  productId: string
  quantity: number
  unitPrice: string
  subtotal: string
  action: ReturnAction
}

export interface CreateReturnData {
  returnNumber: string
  transactionId: string
  cashierId: string
  shiftId: string | null
  reason: string
  refundAmount: string
  refundMethod: PaymentMethod
  items: CreateReturnItemData[]
}

export interface ReturnRepository {
  create: (data: CreateReturnData, tx?: Prisma.TransactionClient) => Promise<ReturnView>
  findById: (id: string) => Promise<ReturnView | null>
  list: (input: ListReturnsInput) => Promise<{ items: ReturnView[]; total: number }>
  sumReturnedQuantities: (
    transactionId: string,
    tx?: Prisma.TransactionClient,
  ) => Promise<Map<string, number>>
  sumRefundedAmount: (
    transactionId: string,
    tx?: Prisma.TransactionClient,
  ) => Promise<number>
}

const returnInclude = {
  cashier: { select: { id: true, name: true } },
  transaction: { select: { id: true, invoiceNumber: true } },
  items: {
    include: { product: { select: { id: true, name: true, sku: true } } },
    orderBy: { id: 'asc' },
  },
} as const

export const createReturnRepository = (prisma: PrismaClient): ReturnRepository => ({
  create: (data, tx) =>
    (tx ?? prisma).returnTransaction.create({
      data: {
        returnNumber: data.returnNumber,
        transactionId: data.transactionId,
        cashierId: data.cashierId,
        shiftId: data.shiftId,
        reason: data.reason,
        refundAmount: new Prisma.Decimal(data.refundAmount),
        refundMethod: data.refundMethod,
        status: 'COMPLETED',
        items: {
          create: data.items.map((item) => ({
            transactionItemId: item.transactionItemId,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(item.unitPrice),
            subtotal: new Prisma.Decimal(item.subtotal),
            action: item.action,
          })),
        },
      },
      include: returnInclude,
    }),

  findById: (id) =>
    prisma.returnTransaction.findUnique({ where: { id }, include: returnInclude }),

  list: async ({ skip, take, transactionId, cashierId, status, startAt, endAt }) => {
    const where: Prisma.ReturnTransactionWhereInput = {}

    if (transactionId !== undefined) where.transactionId = transactionId
    if (cashierId !== undefined) where.cashierId = cashierId
    if (status !== undefined) where.status = status

    if (startAt !== undefined || endAt !== undefined) {
      where.createdAt = {
        ...(startAt !== undefined ? { gte: startAt } : {}),
        ...(endAt !== undefined ? { lte: endAt } : {}),
      }
    }

    const [items, total] = await Promise.all([
      prisma.returnTransaction.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: returnInclude,
      }),
      prisma.returnTransaction.count({ where }),
    ])

    return { items, total }
  },

  sumReturnedQuantities: async (transactionId, tx) => {
    const rows = await (tx ?? prisma).returnItem.findMany({
      where: {
        returnTransaction: { transactionId, status: 'COMPLETED' },
      },
      select: { transactionItemId: true, quantity: true },
    })

    const totals = new Map<string, number>()
    for (const row of rows) {
      totals.set(row.transactionItemId, (totals.get(row.transactionItemId) ?? 0) + row.quantity)
    }

    return totals
  },

  sumRefundedAmount: async (transactionId, tx) => {
    const result = await (tx ?? prisma).returnTransaction.aggregate({
      where: { transactionId, status: 'COMPLETED' },
      _sum: { refundAmount: true },
    })

    return Number(result._sum.refundAmount ?? 0)
  },
})