import type { Prisma, PrismaClient, StockMovement } from '@prisma/client'
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

export interface StockMovementRepository {
  create: (
    data: CreateMovementData,
    tx?: Prisma.TransactionClient,
  ) => Promise<StockMovement>
}

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
})
