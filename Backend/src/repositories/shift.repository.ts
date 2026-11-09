import { Prisma, type PrismaClient, type Shift, type CashMovement } from '@prisma/client'

export interface ShiftWithRelations extends Shift {
  cashier: { id: string; name: string }
  cashMovements: Array<CashMovement & { createdBy: { id: string; name: string } }>
  _count?: { transactions: number }
}

export interface ShiftRepository {
  findActiveByCashierId(cashierId: string): Promise<ShiftWithRelations | null>
  findById(id: string): Promise<ShiftWithRelations | null>
  create(data: { cashierId: string; startingCash: number }): Promise<ShiftWithRelations>
  close(
    id: string,
    data: {
      expectedCash: number
      actualCash: number
      cashDifference: number
      differenceNote?: string | undefined
      closedAt: Date
    },
  ): Promise<ShiftWithRelations>
  createCashMovement(
    data: {
      shiftId: string
      type: 'CASH_IN' | 'CASH_OUT'
      amount: number
      reason: string
      createdById: string
    },
    tx?: Prisma.TransactionClient,
  ): Promise<CashMovement & { createdBy: { id: string; name: string } }>
  calculateShiftCashSummary(shiftId: string): Promise<{
    startingCash: number
    cashSales: number
    cashIn: number
    cashOut: number
    expectedCash: number
  }>
  findHistory(params: {
    cashierId?: string | undefined
    status?: 'OPEN' | 'CLOSED' | undefined
    page?: number | undefined
    limit?: number | undefined
  }): Promise<{ items: ShiftWithRelations[]; total: number }>
}

const shiftInclude = {
  cashier: { select: { id: true, name: true } },
  cashMovements: {
    include: { createdBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' as const },
  },
  _count: { select: { transactions: true } },
}

export const createShiftRepository = (prisma: PrismaClient): ShiftRepository => ({
  async findActiveByCashierId(cashierId: string) {
    return prisma.shift.findFirst({
      where: { cashierId, status: 'OPEN' },
      include: shiftInclude,
      orderBy: { openedAt: 'desc' },
    })
  },

  async findById(id: string) {
    return prisma.shift.findUnique({
      where: { id },
      include: shiftInclude,
    })
  },

  async create({ cashierId, startingCash }) {
    return prisma.shift.create({
      data: {
        cashierId,
        startingCash: new Prisma.Decimal(startingCash),
        status: 'OPEN',
      },
      include: shiftInclude,
    })
  },

  async close(id, { expectedCash, actualCash, cashDifference, differenceNote, closedAt }) {
    return prisma.shift.update({
      where: { id },
      data: {
        status: 'CLOSED',
        expectedCash: new Prisma.Decimal(expectedCash),
        actualCash: new Prisma.Decimal(actualCash),
        cashDifference: new Prisma.Decimal(cashDifference),
        differenceNote: differenceNote ?? null,
        closedAt,
      },
      include: shiftInclude,
    })
  },

  async createCashMovement({ shiftId, type, amount, reason, createdById }, tx) {
    return (tx ?? prisma).cashMovement.create({
      data: {
        shiftId,
        type,
        amount: new Prisma.Decimal(amount),
        reason,
        createdById,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    })
  },

  async calculateShiftCashSummary(shiftId: string) {
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { cashMovements: true },
    })
    if (!shift) {
      throw new Error('Shift tidak ditemukan')
    }

    // Hitung total penjualan tunai yang tercatat pada shift ini
    const cashSalesAggregate = await prisma.transaction.aggregate({
      where: {
        shiftId,
        paymentMethod: 'CASH',
        status: 'COMPLETED',
      },
      _sum: {
        amountPaid: true,
        changeAmount: true,
      },
    })

    const netCashSales =
      Number(cashSalesAggregate._sum.amountPaid ?? 0) -
      Number(cashSalesAggregate._sum.changeAmount ?? 0)

    let cashIn = 0
    let cashOut = 0

    for (const mov of shift.cashMovements) {
      const amt = Number(mov.amount)
      if (mov.type === 'CASH_IN') cashIn += amt
      if (mov.type === 'CASH_OUT') cashOut += amt
    }

    const startingCash = Number(shift.startingCash)
    const expectedCash = startingCash + netCashSales + cashIn - cashOut

    return {
      startingCash,
      cashSales: netCashSales,
      cashIn,
      cashOut,
      expectedCash,
    }
  },

  async findHistory({ cashierId, status, page = 1, limit = 10 }) {
    const where: Prisma.ShiftWhereInput = {}
    if (cashierId) where.cashierId = cashierId
    if (status) where.status = status

    const [items, total] = await Promise.all([
      prisma.shift.findMany({
        where,
        include: shiftInclude,
        orderBy: { openedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.shift.count({ where }),
    ])

    return { items, total }
  },
})
