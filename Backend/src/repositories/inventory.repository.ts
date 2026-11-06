import { Prisma, type PrismaClient } from '@prisma/client'
import type { ProductView } from './product.repository.js'

export interface ListLowStockInput {
  skip: number
  take: number
}

export interface InventoryRepository {
  listLowStock: (input: ListLowStockInput) => Promise<{ items: ProductView[]; total: number }>
}

export const createInventoryRepository = (prisma: PrismaClient): InventoryRepository => ({
  listLowStock: async ({ skip, take }) => {
    const [idRows, countRows] = await Promise.all([
      prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id
        FROM products
        WHERE is_active = true AND stock <= min_stock
        ORDER BY stock ASC, name ASC
        LIMIT ${take} OFFSET ${skip}
      `),
      prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
        SELECT COUNT(*)::int AS count
        FROM products
        WHERE is_active = true AND stock <= min_stock
      `),
    ])

    const ids = idRows.map((row) => row.id)

    if (ids.length === 0) {
      return { items: [], total: countRows[0]?.count ?? 0 }
    }

    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      include: { category: { select: { id: true, name: true } } },
    })
    const byId = new Map(products.map((product) => [product.id, product]))
    const items = ids
      .map((id) => byId.get(id))
      .filter((product): product is ProductView => product !== undefined)

    return { items, total: countRows[0]?.count ?? 0 }
  },
})