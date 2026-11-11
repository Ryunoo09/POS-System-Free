import { Prisma } from '@prisma/client'
import type {
  PrismaClient,
  Product,
  StockOpnameItem,
  StockOpnameSession,
  User,
} from '@prisma/client'
import type { StockOpnameScope, StockOpnameStatus } from '../constants/opname.js'

export type OpnameItemView = StockOpnameItem & {
  countedBy: Pick<User, 'id' | 'name'> | null
}

export type OpnameSessionView = StockOpnameSession & {
  createdBy: Pick<User, 'id' | 'name'>
  approvedBy: Pick<User, 'id' | 'name'> | null
}

export type OpnameDetailView = OpnameSessionView & { items: OpnameItemView[] }

export interface OpnameListRow extends OpnameSessionView {
  totalItems: number
  countedItems: number
}

export interface ListStockOpnamesInput {
  skip: number
  take: number
  status?: StockOpnameStatus | undefined
  scope?: StockOpnameScope | undefined
  createdById?: string | undefined
  startAt?: Date | undefined
  endAt?: Date | undefined
}

export interface CreateOpnameSessionData {
  sessionNumber: string
  name: string
  scope: StockOpnameScope
  notes: string | null
  createdById: string
}

export interface CreateOpnameItemData {
  productId: string
  skuSnapshot: string
  barcodeSnapshot: string | null
  nameSnapshot: string
  systemStock: number
}

export interface CreateOpnameData {
  session: CreateOpnameSessionData
  items: CreateOpnameItemData[]
}

export type UpdateOpnameSessionData = Prisma.StockOpnameSessionUncheckedUpdateInput

export type OpnameTx = Prisma.TransactionClient

export type ProductForOpname = Pick<Product, 'id' | 'sku' | 'barcode' | 'name' | 'stock'>

export interface StockOpnameRepository {
  createSession: (
    data: CreateOpnameData,
    tx?: Prisma.TransactionClient,
  ) => Promise<OpnameSessionView>
  listSessions: (
    input: ListStockOpnamesInput,
  ) => Promise<{ items: OpnameListRow[]; total: number }>
  findById: (id: string) => Promise<OpnameDetailView | null>
  findByIdForUpdate: (
    id: string,
    tx: Prisma.TransactionClient,
  ) => Promise<OpnameDetailView | null>
  updateSession: (
    id: string,
    data: UpdateOpnameSessionData,
    tx?: Prisma.TransactionClient,
  ) => Promise<OpnameSessionView>
  findItem: (
    sessionId: string,
    itemId: string,
    tx?: Prisma.TransactionClient,
  ) => Promise<OpnameItemView | null>
  updateItem: (
    id: string,
    data: Prisma.StockOpnameItemUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) => Promise<OpnameItemView>
  findActiveProducts: (input: {
    productIds?: string[] | undefined
    categoryIds?: string[] | undefined
  }) => Promise<ProductForOpname[]>
}

const sessionInclude = {
  createdBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
} satisfies Prisma.StockOpnameSessionInclude

const detailInclude = {
  ...sessionInclude,
  items: {
    orderBy: [{ skuSnapshot: 'asc' }, { id: 'asc' }],
    include: { countedBy: { select: { id: true, name: true } } },
  },
} satisfies Prisma.StockOpnameSessionInclude

const itemInclude = {
  countedBy: { select: { id: true, name: true } },
} satisfies Prisma.StockOpnameItemInclude

const buildWhere = (input: ListStockOpnamesInput): Prisma.StockOpnameSessionWhereInput => {
  const where: Prisma.StockOpnameSessionWhereInput = {}

  if (input.status !== undefined) where.status = input.status
  if (input.scope !== undefined) where.scope = input.scope
  if (input.createdById !== undefined) where.createdById = input.createdById

  if (input.startAt !== undefined || input.endAt !== undefined) {
    where.createdAt = {
      ...(input.startAt !== undefined ? { gte: input.startAt } : {}),
      ...(input.endAt !== undefined ? { lte: input.endAt } : {}),
    }
  }

  return where
}

export const createStockOpnameRepository = (prisma: PrismaClient): StockOpnameRepository => ({
  createSession: async (data, tx) => {
    const client = tx ?? prisma

    return client.stockOpnameSession.create({
      data: {
        sessionNumber: data.session.sessionNumber,
        name: data.session.name,
        scope: data.session.scope,
        notes: data.session.notes,
        createdById: data.session.createdById,
        items: { createMany: { data: data.items } },
      },
      include: sessionInclude,
    })
  },

  listSessions: async (input) => {
    const where = buildWhere(input)
    const [rows, total] = await Promise.all([
      prisma.stockOpnameSession.findMany({
        where,
        skip: input.skip,
        take: input.take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: sessionInclude,
      }),
      prisma.stockOpnameSession.count({ where }),
    ])

    const sessionIds = rows.map((row) => row.id)
    const grouped =
      sessionIds.length === 0
        ? []
        : await prisma.stockOpnameItem.groupBy({
            by: ['sessionId'],
            where: { sessionId: { in: sessionIds } },
            _count: { _all: true },
          })
    const groupedCounted =
      sessionIds.length === 0
        ? []
        : await prisma.stockOpnameItem.groupBy({
            by: ['sessionId'],
            where: { sessionId: { in: sessionIds }, physicalStock: { not: null } },
            _count: { _all: true },
          })

    const totalBySession = new Map(grouped.map((row) => [row.sessionId, row._count._all]))
    const countedBySession = new Map(
      groupedCounted.map((row) => [row.sessionId, row._count._all]),
    )

    return {
      items: rows.map((row) => ({
        ...row,
        totalItems: totalBySession.get(row.id) ?? 0,
        countedItems: countedBySession.get(row.id) ?? 0,
      })),
      total,
    }
  },

  findById: (id) => prisma.stockOpnameSession.findUnique({ where: { id }, include: detailInclude }),

  findByIdForUpdate: async (id, tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT id FROM stock_opname_sessions WHERE id = ${id}::uuid FOR UPDATE`,
    )

    if (locked.length === 0) return null

    return tx.stockOpnameSession.findUnique({ where: { id }, include: detailInclude })
  },

  updateSession: (id, data, tx) =>
    (tx ?? prisma).stockOpnameSession.update({
      where: { id },
      data,
      include: sessionInclude,
    }),

  findItem: (sessionId, itemId, tx) =>
    (tx ?? prisma).stockOpnameItem.findFirst({
      where: { id: itemId, sessionId },
      include: itemInclude,
    }),

  updateItem: (id, data, tx) =>
    (tx ?? prisma).stockOpnameItem.update({ where: { id }, data, include: itemInclude }),

  findActiveProducts: ({ productIds, categoryIds }) =>
    prisma.product.findMany({
      where: {
        isActive: true,
        ...(productIds !== undefined ? { id: { in: productIds } } : {}),
        ...(categoryIds !== undefined ? { categoryId: { in: categoryIds } } : {}),
      },
      orderBy: [{ sku: 'asc' }],
      select: { id: true, sku: true, barcode: true, name: true, stock: true },
    }),
})