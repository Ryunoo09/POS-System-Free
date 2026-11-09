import { Prisma } from '@prisma/client'
import type {
  PrismaClient,
  Transaction,
  TransactionItem,
} from '@prisma/client'
import type { PaymentMethod, TransactionStatus } from '../constants/transactions.js'

export type TransactionView = Transaction & {
  cashier: { id: string; name: string }
  _count: { items: number }
}

export type TransactionDetailView = Transaction & {
  cashier: { id: string; name: string }
  items: TransactionItem[]
}

export interface TransactionFilters {
  status?: TransactionStatus | undefined
  cashierId?: string | undefined
  paymentMethod?: PaymentMethod | undefined
  search?: string | undefined
  startAt?: Date | undefined
  endAt?: Date | undefined
}

export interface CashierOption {
  id: string
  name: string
}

export interface ListTransactionsInput extends TransactionFilters {
  skip: number
  take: number
}

export interface CreateCheckoutItemData {
  productId: string
  productName: string
  productSku: string
  quantity: number
  unitPrice: string
  unitCost: string
  discountAmount: string
  subtotal: string
}

export interface CreateCheckoutData {
  invoiceNumber: string
  idempotencyKey: string
  cashierId: string
  subtotal: string
  discountAmount: string
  taxAmount: string
  totalAmount: string
  paymentMethod: PaymentMethod
  paymentReference: string | null
  amountPaid: string
  changeAmount: string
  shiftId?: string | null
  items: CreateCheckoutItemData[]
}

export interface TransactionRepository {
  list: (input: ListTransactionsInput) => Promise<{ items: TransactionView[]; total: number }>
  listCashiers: () => Promise<CashierOption[]>
  findDetailById: (id: string) => Promise<TransactionDetailView | null>
  findByIdempotencyKey: (key: string) => Promise<TransactionDetailView | null>
  createCheckout: (
    data: CreateCheckoutData,
    tx: Prisma.TransactionClient,
  ) => Promise<TransactionDetailView>
  nextInvoiceSequence: (tx: Prisma.TransactionClient) => Promise<number>
}

const listInclude = {
  cashier: { select: { id: true, name: true } },
  _count: { select: { items: true } },
} as const

const detailInclude = {
  cashier: { select: { id: true, name: true } },
  items: { orderBy: { id: 'asc' } },
} as const

export const createTransactionRepository = (prisma: PrismaClient): TransactionRepository => ({
  list: async ({ skip, take, status, cashierId, paymentMethod, search, startAt, endAt }) => {
    const where: Prisma.TransactionWhereInput = {}

    if (status !== undefined) where.status = status
    if (cashierId !== undefined) where.cashierId = cashierId
    if (paymentMethod !== undefined) where.paymentMethod = paymentMethod
    if (search) where.invoiceNumber = { contains: search, mode: 'insensitive' }

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
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: listInclude,
      }),
      prisma.transaction.count({ where }),
    ])

    return { items, total }
  },

  listCashiers: () =>
    prisma.user.findMany({
      where: { role: 'CASHIER' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),

  findDetailById: (id) =>
    prisma.transaction.findUnique({ where: { id }, include: detailInclude }),

  findByIdempotencyKey: (key) =>
    prisma.transaction.findUnique({ where: { idempotencyKey: key }, include: detailInclude }),

  createCheckout: (data, tx) =>
    tx.transaction.create({
      data: {
        invoiceNumber: data.invoiceNumber,
        idempotencyKey: data.idempotencyKey,
        cashierId: data.cashierId,
        subtotal: data.subtotal,
        discountAmount: data.discountAmount,
        taxAmount: data.taxAmount,
        totalAmount: data.totalAmount,
        paymentMethod: data.paymentMethod,
        paymentReference: data.paymentReference,
        amountPaid: data.amountPaid,
        changeAmount: data.changeAmount,
        shiftId: data.shiftId ?? null,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            productNameSnapshot: item.productName,
            productSkuSnapshot: item.productSku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            unitCost: item.unitCost,
            discountAmount: item.discountAmount,
            subtotal: item.subtotal,
          })),
        },
      },
      include: detailInclude,
    }),

  nextInvoiceSequence: async (tx) => {
    const rows = await tx.$queryRaw<Array<{ nextval: bigint }>>(
      Prisma.sql`SELECT nextval('invoice_number_seq') AS nextval`,
    )
    const value = rows[0]?.nextval

    return typeof value === 'bigint' ? Number(value) : Number(value ?? 0)
  },
})
