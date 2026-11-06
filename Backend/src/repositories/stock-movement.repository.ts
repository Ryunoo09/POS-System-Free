import type { Prisma, PrismaClient, Product, StockMovement, User } from '@prisma/client'
import type { StockMovementType, StockReferenceType } from '../constants/stock.js'

export interface CreateMovementData {
  productId: string
  movementType: StockMovementType
  quantity: number
  stockBefore: number
  stockAfter: number
  referenceType: StockReferenceType
  referenceId: string | null
  notes: string | null
  createdById: string
}

export type StockMovementView = StockMovement & {
  product: Pick<Product, 'id' | 'sku' | 'name'>
  createdBy: Pick<User, 'id' | 'name'>
  invoiceNumber: string | null
}

export interface StockMovementFilters {
  productId?: string | undefined
  movementType?: StockMovementType | undefined
  startAt?: Date | undefined
  endAt?: Date | undefined
}

export interface ListStockMovementsInput extends StockMovementFilters {
  skip: number
  take: number
}

export interface StockMovementRepository {
  create: (
    data: CreateMovementData,
    tx?: Prisma.TransactionClient,
  ) => Promise<StockMovement>
  list: (
    input: ListStockMovementsInput,
  ) => Promise<{ items: StockMovementView[]; total: number }>
}

const include = {
  product: { select: { id: true, sku: true, name: true } },
  createdBy: { select: { id: true, name: true } },
} as const

export const createStockMovementRepository = (
  prisma: PrismaClient,
): StockMovementRepository => ({
  create: (data, tx) =>
    (tx ?? prisma).stockMovement.create({
      data: {
        productId: data.productId,
        movementType: data.movementType,
        quantity: data.quantity,
        stockBefore: data.stockBefore,
        stockAfter: data.stockAfter,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        notes: data.notes,
        createdById: data.createdById,
      },
    }),

  list: async ({ skip, take, productId, movementType, startAt, endAt }) => {
    const where: Prisma.StockMovementWhereInput = {}

    if (productId !== undefined) where.productId = productId
    if (movementType !== undefined) where.movementType = movementType

    if (startAt !== undefined || endAt !== undefined) {
      where.createdAt = {
        ...(startAt !== undefined ? { gte: startAt } : {}),
        ...(endAt !== undefined ? { lte: endAt } : {}),
      }
    }

    const [rows, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include,
      }),
      prisma.stockMovement.count({ where }),
    ])

    const transactionIds = [
      ...new Set(
        rows
          .filter((row) => row.referenceType === 'TRANSACTION' && row.referenceId)
          .map((row) => row.referenceId as string),
      ),
    ]

    const invoices =
      transactionIds.length === 0
        ? []
        : await prisma.transaction.findMany({
            where: { id: { in: transactionIds } },
            select: { id: true, invoiceNumber: true },
          })

    const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice.invoiceNumber]))

    const items: StockMovementView[] = rows.map((row) => ({
      ...row,
      invoiceNumber:
        row.referenceType === 'TRANSACTION' && row.referenceId
          ? (invoiceById.get(row.referenceId) ?? null)
          : null,
    }))

    return { items, total }
  },
})