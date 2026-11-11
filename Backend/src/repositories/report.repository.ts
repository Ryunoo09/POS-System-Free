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

export type SalesGroupBy = 'daily' | 'weekly' | 'monthly'

export type ProductReportSort = 'best_selling' | 'revenue' | 'profit'

export interface PeriodSalesRow {
  period: string
  revenue: string
  cogs: string
  grossProfit: string
  transactionCount: number
}

export interface ProductSalesRow {
  productId: string
  sku: string
  name: string
  category: string | null
  quantitySold: number
  revenue: string
  cogs: string
  grossProfit: string
}

export interface CashierSalesRow {
  cashierId: string
  cashierName: string
  transactionCount: number
  revenue: string
  grossProfit: string
  averageTransaction: string
}

export interface PaymentMethodSalesRow {
  paymentMethod: string
  transactionCount: number
  revenue: string
}

export interface CategorySalesRow {
  categoryId: string | null
  category: string
  quantitySold: number
  revenue: string
}

export interface ListProductSalesInput {
  skip: number
  take: number
  categoryId?: string | undefined
  sort: ProductReportSort
}

export interface ValuationItemRow {
  productId: string
  sku: string
  name: string
  category: string
  stock: number
  averageCost: string
  inventoryValue: string
}

export interface ValuationCategoryRow {
  categoryId: string | null
  category: string
  quantity: number
  value: string
}

export interface InventoryValuation {
  totalValue: string
  totalQuantity: number
  items: ValuationItemRow[]
  byCategory: ValuationCategoryRow[]
}

export interface CategoryCogsRow {
  categoryId: string | null
  category: string
  quantitySold: number
  revenue: string
  cogs: string
  grossProfit: string
}

export interface ReportRepository {
  getSummary: (range: ResolvedDateRange) => Promise<SummaryTotals>
  getDailySales: (range: ResolvedDateRange) => Promise<DailySalesRow[]>
  getTopProducts: (range: ResolvedDateRange, limit: number) => Promise<TopProductRow[]>
  getPeriodSales: (range: ResolvedDateRange, groupBy: SalesGroupBy) => Promise<PeriodSalesRow[]>
  listProductSales: (
    range: ResolvedDateRange,
    input: ListProductSalesInput,
  ) => Promise<{ items: ProductSalesRow[]; total: number }>
  listCashierSales: (range: ResolvedDateRange) => Promise<CashierSalesRow[]>
  getPaymentMethodSales: (range: ResolvedDateRange) => Promise<PaymentMethodSalesRow[]>
  getCategorySales: (range: ResolvedDateRange) => Promise<CategorySalesRow[]>
  getInventoryValuation: (input: { categoryId?: string | undefined }) => Promise<InventoryValuation>
  getCategoryCogs: (
    range: ResolvedDateRange,
    categoryId?: string | undefined,
  ) => Promise<CategoryCogsRow[]>
}

const toMoney = (value: Prisma.Decimal | string | number | null | undefined): string =>
  new Prisma.Decimal(value ?? 0).toFixed(2)

const groupByUnit: Record<SalesGroupBy, string> = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
}

const productOrderBy: Record<ProductReportSort, Prisma.Sql> = {
  best_selling: Prisma.raw('quantity_sold DESC, revenue DESC, name ASC'),
  revenue: Prisma.raw('revenue DESC, quantity_sold DESC, name ASC'),
  profit: Prisma.raw('gross_profit DESC, revenue DESC, name ASC'),
}

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

  getPeriodSales: async ({ startAt, endAt }, groupBy) => {
    const rows = await prisma.$queryRaw<
      Array<{
        period: string
        transaction_count: number
        revenue: Prisma.Decimal
        cogs: Prisma.Decimal
      }>
    >(Prisma.sql`
      WITH txn AS (
        SELECT t.id, t.created_at, (t.subtotal - t.discount_amount) AS revenue
        FROM transactions t
        WHERE t.status = 'COMPLETED'
          AND t.created_at >= ${startAt}
          AND t.created_at <= ${endAt}
      ),
      item_cogs AS (
        SELECT ti.transaction_id, SUM(ti.unit_cost * ti.quantity) AS cogs
        FROM transaction_items ti
        JOIN txn ON txn.id = ti.transaction_id
        GROUP BY ti.transaction_id
      )
      SELECT
        to_char(date_trunc(${groupByUnit[groupBy]}::text, txn.created_at AT TIME ZONE 'Asia/Jakarta'), 'YYYY-MM-DD') AS period,
        COUNT(*)::int AS transaction_count,
        COALESCE(SUM(txn.revenue), 0) AS revenue,
        COALESCE(SUM(item_cogs.cogs), 0) AS cogs
      FROM txn
      LEFT JOIN item_cogs ON item_cogs.transaction_id = txn.id
      GROUP BY 1
      ORDER BY 1
    `)

    return rows.map((row) => {
      const revenue = new Prisma.Decimal(row.revenue)

      return {
        period: row.period,
        revenue: revenue.toFixed(2),
        cogs: new Prisma.Decimal(row.cogs).toFixed(2),
        grossProfit: revenue.minus(row.cogs).toFixed(2),
        transactionCount: row.transaction_count,
      }
    })
  },

  listProductSales: async ({ startAt, endAt }, { skip, take, categoryId, sort }) => {
    const categoryFilter = categoryId
      ? Prisma.sql`AND p.category_id = ${categoryId}::uuid`
      : Prisma.empty

    const [rows, totalRows] = await Promise.all([
      prisma.$queryRaw<
        Array<{
          product_id: string
          sku: string
          name: string
          category: string | null
          quantity_sold: number
          revenue: Prisma.Decimal
          cogs: Prisma.Decimal
          gross_profit: Prisma.Decimal
        }>
      >(Prisma.sql`
        SELECT
          ti.product_id,
          ti.product_sku_snapshot AS sku,
          ti.product_name_snapshot AS name,
          c.name AS category,
          SUM(ti.quantity)::int AS quantity_sold,
          COALESCE(SUM(ti.subtotal), 0) AS revenue,
          COALESCE(SUM(ti.unit_cost * ti.quantity), 0) AS cogs,
          COALESCE(SUM(ti.subtotal), 0) - COALESCE(SUM(ti.unit_cost * ti.quantity), 0) AS gross_profit
        FROM transaction_items ti
        JOIN transactions t ON t.id = ti.transaction_id
        JOIN products p ON p.id = ti.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE t.status = 'COMPLETED'
          AND t.created_at >= ${startAt}
          AND t.created_at <= ${endAt}
          ${categoryFilter}
        GROUP BY ti.product_id, ti.product_sku_snapshot, ti.product_name_snapshot, c.name
        ORDER BY ${productOrderBy[sort]}
        LIMIT ${take} OFFSET ${skip}
      `),
      prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
        SELECT COUNT(*)::int AS count
        FROM (
          SELECT ti.product_id
          FROM transaction_items ti
          JOIN transactions t ON t.id = ti.transaction_id
          JOIN products p ON p.id = ti.product_id
          WHERE t.status = 'COMPLETED'
            AND t.created_at >= ${startAt}
            AND t.created_at <= ${endAt}
            ${categoryFilter}
          GROUP BY ti.product_id
        ) AS grouped
      `),
    ])

    return {
      items: rows.map((row) => ({
        productId: row.product_id,
        sku: row.sku,
        name: row.name,
        category: row.category,
        quantitySold: row.quantity_sold,
        revenue: toMoney(row.revenue),
        cogs: toMoney(row.cogs),
        grossProfit: toMoney(row.gross_profit),
      })),
      total: totalRows[0]?.count ?? 0,
    }
  },

  listCashierSales: async ({ startAt, endAt }) => {
    const rows = await prisma.$queryRaw<
      Array<{
        cashier_id: string
        cashier_name: string
        transaction_count: number
        revenue: Prisma.Decimal
        gross_profit: Prisma.Decimal
        average_transaction: Prisma.Decimal
      }>
    >(Prisma.sql`
      WITH txn AS (
        SELECT t.id, t.cashier_id, (t.subtotal - t.discount_amount) AS revenue
        FROM transactions t
        WHERE t.status = 'COMPLETED'
          AND t.created_at >= ${startAt}
          AND t.created_at <= ${endAt}
      ),
      item_cogs AS (
        SELECT ti.transaction_id, SUM(ti.unit_cost * ti.quantity) AS cogs
        FROM transaction_items ti
        JOIN txn ON txn.id = ti.transaction_id
        GROUP BY ti.transaction_id
      )
      SELECT
        u.id AS cashier_id,
        u.name AS cashier_name,
        COUNT(*)::int AS transaction_count,
        COALESCE(SUM(txn.revenue), 0) AS revenue,
        COALESCE(SUM(txn.revenue), 0) - COALESCE(SUM(item_cogs.cogs), 0) AS gross_profit,
        ROUND(COALESCE(SUM(txn.revenue), 0) / NULLIF(COUNT(*), 0), 2) AS average_transaction
      FROM txn
      JOIN users u ON u.id = txn.cashier_id
      LEFT JOIN item_cogs ON item_cogs.transaction_id = txn.id
      GROUP BY u.id, u.name
      ORDER BY revenue DESC, u.name ASC
    `)

    return rows.map((row) => ({
      cashierId: row.cashier_id,
      cashierName: row.cashier_name,
      transactionCount: row.transaction_count,
      revenue: toMoney(row.revenue),
      grossProfit: toMoney(row.gross_profit),
      averageTransaction: toMoney(row.average_transaction),
    }))
  },

  getPaymentMethodSales: async ({ startAt, endAt }) => {
    const rows = await prisma.$queryRaw<
      Array<{ payment_method: string; transaction_count: number; revenue: Prisma.Decimal }>
    >(Prisma.sql`
      SELECT
        t.payment_method,
        COUNT(*)::int AS transaction_count,
        COALESCE(SUM(t.subtotal - t.discount_amount), 0) AS revenue
      FROM transactions t
      WHERE t.status = 'COMPLETED'
        AND t.created_at >= ${startAt}
        AND t.created_at <= ${endAt}
      GROUP BY t.payment_method
      ORDER BY revenue DESC, t.payment_method ASC
    `)

    return rows.map((row) => ({
      paymentMethod: row.payment_method,
      transactionCount: row.transaction_count,
      revenue: toMoney(row.revenue),
    }))
  },

  getCategorySales: async ({ startAt, endAt }) => {
    const rows = await prisma.$queryRaw<
      Array<{
        category_id: string | null
        category: string
        quantity_sold: number
        revenue: Prisma.Decimal
      }>
    >(Prisma.sql`
      SELECT
        c.id AS category_id,
        COALESCE(c.name, 'Tanpa Kategori') AS category,
        SUM(ti.quantity)::int AS quantity_sold,
        COALESCE(SUM(ti.subtotal), 0) AS revenue
      FROM transaction_items ti
      JOIN transactions t ON t.id = ti.transaction_id
      LEFT JOIN products p ON p.id = ti.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE t.status = 'COMPLETED'
        AND t.created_at >= ${startAt}
        AND t.created_at <= ${endAt}
      GROUP BY c.id, c.name
      ORDER BY revenue DESC, category ASC
    `)

    return rows.map((row) => ({
      categoryId: row.category_id,
      category: row.category,
      quantitySold: row.quantity_sold,
      revenue: toMoney(row.revenue),
    }))
  },

  getInventoryValuation: async ({ categoryId }) => {
    const categoryFilter = categoryId
      ? Prisma.sql`AND p.category_id = ${categoryId}::uuid`
      : Prisma.empty

    const [itemRows, categoryRows] = await Promise.all([
      prisma.$queryRaw<
        Array<{
          product_id: string
          sku: string
          name: string
          category: string
          stock: number
          average_cost: Prisma.Decimal
          inventory_value: Prisma.Decimal
        }>
      >(Prisma.sql`
        SELECT
          p.id AS product_id,
          p.sku,
          p.name,
          COALESCE(c.name, 'Tanpa Kategori') AS category,
          p.stock,
          p.average_cost,
          (p.stock * p.average_cost) AS inventory_value
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.stock > 0
          ${categoryFilter}
        ORDER BY inventory_value DESC, p.name ASC
      `),
      prisma.$queryRaw<
        Array<{
          category_id: string | null
          category: string
          quantity: number
          value: Prisma.Decimal
        }>
      >(Prisma.sql`
        SELECT
          p.category_id,
          COALESCE(c.name, 'Tanpa Kategori') AS category,
          SUM(p.stock)::int AS quantity,
          COALESCE(SUM(p.stock * p.average_cost), 0) AS value
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.stock > 0
          ${categoryFilter}
        GROUP BY p.category_id, c.name
        ORDER BY value DESC, category ASC
      `),
    ])

    const totalValue = categoryRows.reduce(
      (total, row) => total.plus(row.value),
      new Prisma.Decimal(0),
    )
    const totalQuantity = categoryRows.reduce((total, row) => total + row.quantity, 0)

    return {
      totalValue: totalValue.toFixed(2),
      totalQuantity,
      items: itemRows.map((row) => ({
        productId: row.product_id,
        sku: row.sku,
        name: row.name,
        category: row.category,
        stock: row.stock,
        averageCost: toMoney(row.average_cost),
        inventoryValue: toMoney(row.inventory_value),
      })),
      byCategory: categoryRows.map((row) => ({
        categoryId: row.category_id,
        category: row.category,
        quantity: row.quantity,
        value: toMoney(row.value),
      })),
    }
  },

  getCategoryCogs: async ({ startAt, endAt }, categoryId) => {
    const categoryFilter = categoryId
      ? Prisma.sql`AND p.category_id = ${categoryId}::uuid`
      : Prisma.empty

    const rows = await prisma.$queryRaw<
      Array<{
        category_id: string | null
        category: string
        quantity_sold: number
        revenue: Prisma.Decimal
        cogs: Prisma.Decimal
        gross_profit: Prisma.Decimal
      }>
    >(Prisma.sql`
      SELECT
        p.category_id,
        COALESCE(c.name, 'Tanpa Kategori') AS category,
        SUM(ti.quantity)::int AS quantity_sold,
        COALESCE(SUM(ti.subtotal), 0) AS revenue,
        COALESCE(SUM(ti.unit_cost * ti.quantity), 0) AS cogs,
        COALESCE(SUM(ti.subtotal), 0) - COALESCE(SUM(ti.unit_cost * ti.quantity), 0) AS gross_profit
      FROM transaction_items ti
      JOIN transactions t ON t.id = ti.transaction_id
      LEFT JOIN products p ON p.id = ti.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE t.status = 'COMPLETED'
        AND t.created_at >= ${startAt}
        AND t.created_at <= ${endAt}
        ${categoryFilter}
      GROUP BY p.category_id, c.name
      ORDER BY cogs DESC, category ASC
    `)

    return rows.map((row) => ({
      categoryId: row.category_id,
      category: row.category,
      quantitySold: row.quantity_sold,
      revenue: toMoney(row.revenue),
      cogs: toMoney(row.cogs),
      grossProfit: toMoney(row.gross_profit),
    }))
  },
})
