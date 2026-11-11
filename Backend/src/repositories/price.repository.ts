import type { Prisma, PrismaClient, ScheduledPriceChange } from '@prisma/client'

export type PriceTx = Prisma.TransactionClient

export type PriceHistoryView = Prisma.ProductPriceHistoryGetPayload<{
  include: { changedBy: { select: { id: true; name: true } } }
}>

export interface PriceHistoryData {
  productId: string
  field: 'SELLING_PRICE' | 'COST_PRICE' | 'AVERAGE_COST'
  oldValue: string
  newValue: string
  source: 'MANUAL' | 'SCHEDULED' | 'BULK' | 'PURCHASE'
  reason: string | null
  changedById: string | null
  purchaseOrderId?: string | null
}

export interface CreateScheduleData {
  productId: string
  sellingPrice: string
  effectiveDate: Date
  reason: string
  createdById: string
}

export interface PriceRepository {
  createHistory: (data: PriceHistoryData, tx?: Prisma.TransactionClient) => Promise<void>
  listHistory: (productId: string, take: number) => Promise<PriceHistoryView[]>
  listCostHistory: (productId: string, take: number) => Promise<PriceHistoryView[]>
  findDueSchedules: (
    now: Date,
    productIds?: string[],
    tx?: Prisma.TransactionClient,
  ) => Promise<ScheduledPriceChange[]>
  claimSchedule: (
    id: string,
    now: Date,
    tx?: Prisma.TransactionClient,
  ) => Promise<number>
  createSchedule: (
    data: CreateScheduleData,
    tx?: Prisma.TransactionClient,
  ) => Promise<ScheduledPriceChange>
  findActiveSchedule: (
    productId: string,
    tx?: Prisma.TransactionClient,
  ) => Promise<ScheduledPriceChange | null>
  cancelActiveSchedules: (productId: string, tx?: Prisma.TransactionClient) => Promise<number>
  cancelSchedule: (id: string, productId: string) => Promise<number>
}

export const createPriceRepository = (prisma: PrismaClient): PriceRepository => ({
  createHistory: (data, tx) =>
    (tx ?? prisma).productPriceHistory
      .create({
        data: {
          productId: data.productId,
          field: data.field,
          oldValue: data.oldValue,
          newValue: data.newValue,
          source: data.source,
          reason: data.reason,
          changedById: data.changedById,
          purchaseOrderId: data.purchaseOrderId ?? null,
        },
      })
      .then(() => undefined),

  listHistory: (productId, take) =>
    prisma.productPriceHistory.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take,
      include: { changedBy: { select: { id: true, name: true } } },
    }),

  listCostHistory: (productId, take) =>
    prisma.productPriceHistory.findMany({
      where: { productId, field: { in: ['COST_PRICE', 'AVERAGE_COST'] } },
      orderBy: { createdAt: 'desc' },
      take,
      include: { changedBy: { select: { id: true, name: true } } },
    }),

  findDueSchedules: (now, productIds, tx) =>
    (tx ?? prisma).scheduledPriceChange.findMany({
      where: {
        status: 'SCHEDULED',
        effectiveDate: { lte: now },
        ...(productIds ? { productId: { in: productIds } } : {}),
      },
      orderBy: { effectiveDate: 'asc' },
    }),

  claimSchedule: async (id, now, tx) => {
    const result = await (tx ?? prisma).scheduledPriceChange.updateMany({
      where: { id, status: 'SCHEDULED' },
      data: { status: 'APPLIED', appliedAt: now },
    })

    return result.count
  },

  createSchedule: (data, tx) =>
    (tx ?? prisma).scheduledPriceChange.create({
      data: {
        productId: data.productId,
        sellingPrice: data.sellingPrice,
        effectiveDate: data.effectiveDate,
        reason: data.reason,
        createdById: data.createdById,
      },
    }),

  findActiveSchedule: (productId, tx) =>
    (tx ?? prisma).scheduledPriceChange.findFirst({
      where: { productId, status: 'SCHEDULED' },
      orderBy: { effectiveDate: 'asc' },
    }),

  cancelActiveSchedules: async (productId, tx) => {
    const result = await (tx ?? prisma).scheduledPriceChange.updateMany({
      where: { productId, status: 'SCHEDULED' },
      data: { status: 'CANCELLED' },
    })

    return result.count
  },

  cancelSchedule: async (id, productId) => {
    const result = await prisma.scheduledPriceChange.updateMany({
      where: { id, productId, status: 'SCHEDULED' },
      data: { status: 'CANCELLED' },
    })

    return result.count
  },
})
