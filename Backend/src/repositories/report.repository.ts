import { Prisma, type PrismaClient } from '@prisma/client'
import type { ResolvedDateRange } from '../utils/date-range.js'

export interface SummaryTotals {
  revenue: string
  cogs: string
  grossProfit: string
  transactionCount: number
  totalProducts: number
  totalStock: number
  lowStockCount: number
}

export interface DailySalesRow {
  date: string
  revenue: string
  transactionCount: number
}

export interface TopProductRow {
  productId: string
  sku: string
  name: string
  quantitySold: number
  revenue: string
}

export interface ReportRepository {
  getSummary: (range: ResolvedDateRange) => Promise<SummaryTotals>
  getDailySales: (range: ResolvedDateRange) => Promise<DailySalesRow[]>
  getTopProducts: (range: ResolvedDateRange, limit: number) => Promise<TopProductRow[]>
}

const toMoney = (value: Prisma.Decimal | string | number | null | undefined): string =>
  new Prisma.Decimal(value ?? 0).toFixed(2)

export const createReportRepository = (prisma: PrismaClient): ReportRepository => ({
  getSummary: async ({ startAt, endAt }) => {
    const [transactionAggregate, cogsRows, productAggregate, lowStockRows] = await Promise.all([
      prisma.transaction.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: startAt, lte: endAt } },
        _sum: { subtotal: true, discountAmount: true },
        _count: { _all: true },
      }),
      prisma.$queryRaw<Array<{ cogs: Prisma.Decimal | null }>>(Prisma.sql`
        SELECT COALESCE(SUM(ti.unit_cost * ti.quantity), 0) AS cogs
        FROM transaction_items ti
        JOIN transactions t ON t.id = ti.transaction_id
        WHERE t.status = 'COMPLETED'
          AND t.created_at >= ${startAt}
          AND t.created_at <= ${endAt}
      `),
      prisma.product.aggregate({
        where: { isActive: true },
        _sum: { stock: true },
        _count: { _all: true },
      }),
      prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
        SELECT COUNT(*)::int AS count
        FROM products
        WHERE is_active = true AND stock <= min_stock
      `),
    ])

    const revenue = new Prisma.Decimal(transactionAggregate._sum.subtotal ?? 0).minus(
      transactionAggregate._sum.discountAmount ?? 0,
    )
    const cogs = new Prisma.Decimal(cogsRows[0]?.cogs ?? 0)

    return {
      revenue: revenue.toFixed(2),
      cogs: cogs.toFixed(2),
      grossProfit: revenue.minus(cogs).toFixed(2),
      transactionCount: transactionAggregate._count._all,
      totalProducts: productAggregate._count._all,
      totalStock: productAggregate._sum.stock ?? 0,
      lowStockCount: lowStockRows[0]?.count ?? 0,
    }
  },

  getDailySales: async ({ startAt, endAt }) => {
    const rows = await prisma.$queryRaw<
      Array<{ date: string; revenue: Prisma.Decimal; transaction_count: number }>
    >(Prisma.sql`
      SELECT
        to_char((t.created_at AT TIME ZONE 'Asia/Jakarta')::date, 'YYYY-MM-DD') AS date,
        COALESCE(SUM(t.subtotal - t.discount_amount), 0) AS revenue,
        COUNT(*)::int AS transaction_count
      FROM transactions t
      WHERE t.status = 'COMPLETED'
        AND t.created_at >= ${startAt}
        AND t.created_at <= ${endAt}
      GROUP BY 1
      ORDER BY 1
    `)

    return rows.map((row) => ({
      date: row.date,
      revenue: toMoney(row.revenue),
      transactionCount: row.transaction_count,
    }))
  },

  getTopProducts: async ({ startAt, endAt }, limit) => {
    const rows = await prisma.$queryRaw<
      Array<{
        product_id: string
        sku: string
        name: string
        quantity_sold: number
        revenue: Prisma.Decimal
      }>
    >(Prisma.sql`
      SELECT
        ti.product_id,
        ti.product_sku_snapshot AS sku,
        ti.product_name_snapshot AS name,
        SUM(ti.quantity)::int AS quantity_sold,
        COALESCE(SUM(ti.subtotal), 0) AS revenue
      FROM transaction_items ti
      JOIN transactions t ON t.id = ti.transaction_id
      WHERE t.status = 'COMPLETED'
        AND t.created_at >= ${startAt}
        AND t.created_at <= ${endAt}
      GROUP BY ti.product_id, ti.product_sku_snapshot, ti.product_name_snapshot
      ORDER BY quantity_sold DESC, revenue DESC
      LIMIT ${limit}
    `)

    return rows.map((row) => ({
      productId: row.product_id,
      sku: row.sku,
      name: row.name,
      quantitySold: row.quantity_sold,
      revenue: toMoney(row.revenue),
    }))
  },
})