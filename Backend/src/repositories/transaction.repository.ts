import type { Prisma, PrismaClient, Transaction } from '@prisma/client'
import type { TransactionStatus } from '../constants/transactions.js'

export type TransactionView = Transaction & {
  cashier: { id: string; name: string }
  _count: { items: number }
}

export interface TransactionFilters {
  status?: TransactionStatus | undefined
  cashierId?: string | undefined
  startAt?: Date | undefined
  endAt?: Date | undefined
}

export interface ListTransactionsInput extends TransactionFilters {
  skip: number
  take: number
}

export interface TransactionRepository {
  list: (input: ListTransactionsInput) => Promise<{ items: TransactionView[]; total: number }>
}

const include = {
  cashier: { select: { id: true, name: true } },
  _count: { select: { items: true } },
} as const

export const createTransactionRepository = (prisma: PrismaClient): TransactionRepository => ({
  list: async ({ skip, take, status, cashierId, startAt, endAt }) => {
    const where: Prisma.TransactionWhereInput = {}

    if (status !== undefined) where.status = status
    if (cashierId !== undefined) where.cashierId = cashierId

    if (startAt !== undefined || endAt !== undefined) {
      where.createdAt = {
        ...(startAt !== undefined ? { gte: startAt } : {}),
        ...(endAt !== undefined ? { lte: endAt } : {}),
      }
    }

    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include,
      }),
      prisma.transaction.count({ where }),
    ])

    return { items, total }
  },
})