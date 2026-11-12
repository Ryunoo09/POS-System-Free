import { Prisma, type PrismaClient, type Shift, type CashMovement } from '@prisma/client'

export interface ShiftPaymentBreakdown {
  paymentMethod: string
  transactionCount: number
  revenue: number
}

export interface ShiftWithRelations extends Shift {
  cashier: { id: string; name: string }
  cashMovements: Array<CashMovement & { createdBy: { id: string; name: string } }>
  _count?: { transactions: number }
  salesTotal?: number
  nonCashSales?: number
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
  ): Promise<ShiftWithRelations | null>
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
    nonCashSales: number
    totalSales: number
    cashIn: number
    cashOut: number
    expectedCash: number
    paymentBreakdown: ShiftPaymentBreakdown[]
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
    const result = await prisma.shift.updateMany({
      where: { id, status: 'OPEN' },
      data: {
        status: 'CLOSED',
        expectedCash: new Prisma.Decimal(expectedCash),
        actualCash: new Prisma.Decimal(actualCash),
        cashDifference: new Prisma.Decimal(cashDifference),
        differenceNote: differenceNote ?? null,
        closedAt,
      },
    })

    if (result.count === 0) return null

    return prisma.shift.findUniqueOrThrow({ where: { id }, include: shiftInclude })
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

    // Rekap penjualan shift per metode. Hanya tunai yang mengubah isi laci kas;
    // metode lain tetap ditampilkan agar omzet shift tidak terlihat "hilang".
    const salesRows = await prisma.transaction.groupBy({
      by: ['paymentMethod'],
      where: {
        shiftId,
        status: 'COMPLETED',
      },
      _sum: { totalAmount: true },
      _count: { _all: true },
    })

    const paymentBreakdown: ShiftPaymentBreakdown[] = salesRows.map((row) => ({
      paymentMethod: row.paymentMethod,
      transactionCount: row._count._all,
      revenue: Number(row._sum.totalAmount ?? 0),
    }))

    const cashSales = paymentBreakdown
      .filter((row) => row.paymentMethod === 'CASH')
      .reduce((sum, row) => sum + row.revenue, 0)
    const nonCashSales = paymentBreakdown
      .filter((row) => row.paymentMethod !== 'CASH')
      .reduce((sum, row) => sum + row.revenue, 0)

    let cashIn = 0
    let cashOut = 0

    for (const mov of shift.cashMovements) {
      const amt = Number(mov.amount)
      if (mov.type === 'CASH_IN') cashIn += amt
      if (mov.type === 'CASH_OUT') cashOut += amt
    }

    const startingCash = Number(shift.startingCash)
    const expectedCash = startingCash + cashSales + cashIn - cashOut

    return {
      startingCash,
      cashSales,
      nonCashSales,
      totalSales: cashSales + nonCashSales,
      cashIn,
      cashOut,
      expectedCash,
      paymentBreakdown,
    }
  },

  async findHistory({ cashierId, status, page = 1, limit = 10 }) {
    const where: Prisma.ShiftWhereInput = {}
    if (cashierId) where.cashierId = cashierId
    if (status) where.status = status

    const [rawItems, total] = await Promise.all([
      prisma.shift.findMany({
        where,
        include: shiftInclude,
        orderBy: { openedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.shift.count({ where }),
    ])

    const items: ShiftWithRelations[] = rawItems

    if (items.length > 0) {
      const salesRows = await prisma.transaction.groupBy({
        by: ['shiftId', 'paymentMethod'],
        where: {
          shiftId: { in: items.map((item) => item.id) },
          status: 'COMPLETED',
        },
        _sum: { totalAmount: true },
      })

      const totals = new Map<string, { total: number; nonCash: number }>()

      for (const row of salesRows) {
        if (!row.shiftId) continue

        const entry = totals.get(row.shiftId) ?? { total: 0, nonCash: 0 }
        const amount = Number(row._sum.totalAmount ?? 0)

        entry.total += amount
        if (row.paymentMethod !== 'CASH') entry.nonCash += amount
        totals.set(row.shiftId, entry)
      }

      for (const item of items) {
        const entry = totals.get(item.id)
        item.salesTotal = entry?.total ?? 0
        item.nonCashSales = entry?.nonCash ?? 0
      }
    }

    return { items, total }
  },
})
