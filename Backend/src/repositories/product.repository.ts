import { Prisma } from '@prisma/client'
import type { Category, PrismaClient, Product } from '@prisma/client'

export type ProductView = Product & { category: Pick<Category, 'id' | 'name'> }

export interface ProductFilters {
  search?: string | undefined
  barcode?: string | undefined
  categoryId?: string | undefined
  isActive?: boolean | undefined
}

export interface ListProductsInput extends ProductFilters {
  skip: number
  take: number
}

export interface CreateProductData {
  sku: string
  barcode: string | null
  name: string
  description: string | null
  categoryId: string
  unit: string
  costPrice: string
  sellingPrice: string
  stock: number
  minStock: number
}

export interface UpdateProductData {
  sku?: string | undefined
  barcode?: string | null | undefined
  name?: string | undefined
  description?: string | null | undefined
  categoryId?: string | undefined
  unit?: string | undefined
  costPrice?: string | undefined
  sellingPrice?: string | undefined
  minStock?: number | undefined
  isActive?: boolean | undefined
}

export interface ProductRepository {
  list: (input: ListProductsInput) => Promise<{ items: ProductView[]; total: number }>
  findById: (id: string) => Promise<ProductView | null>
  findByIdForUpdate: (
    id: string,
    tx: Prisma.TransactionClient,
  ) => Promise<ProductView | null>
  findManyByIdsForUpdate: (
    ids: string[],
    tx: Prisma.TransactionClient,
  ) => Promise<ProductView[]>
  findBySku: (sku: string) => Promise<Product | null>
  findByBarcode: (barcode: string) => Promise<Product | null>
  create: (data: CreateProductData, tx?: Prisma.TransactionClient) => Promise<ProductView>
  update: (
    id: string,
    data: UpdateProductData,
    tx?: Prisma.TransactionClient,
  ) => Promise<ProductView>
  updateStock: (
    id: string,
    stock: number,
    tx?: Prisma.TransactionClient,
  ) => Promise<ProductView>
}

const categorySelect = { category: { select: { id: true, name: true } } } as const

const buildWhere = (filters: ProductFilters): Prisma.ProductWhereInput => {
  const where: Prisma.ProductWhereInput = {}

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive
  }

  if (filters.categoryId) {
    where.categoryId = filters.categoryId
  }

  if (filters.barcode) {
    where.barcode = filters.barcode
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { sku: { contains: filters.search, mode: 'insensitive' } },
      { barcode: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  return where
}

export const createProductRepository = (prisma: PrismaClient): ProductRepository => ({
  list: async ({ skip, take, ...filters }) => {
    const where = buildWhere(filters)
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: categorySelect,
      }),
      prisma.product.count({ where }),
    ])

    return { items, total }
  },

  findById: (id) =>
    prisma.product.findUnique({ where: { id }, include: categorySelect }),

  findByIdForUpdate: async (id, tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT id FROM products WHERE id = ${id}::uuid FOR UPDATE`,
    )

    if (locked.length === 0) return null

    return tx.product.findUnique({ where: { id }, include: categorySelect })
  },

  findManyByIdsForUpdate: async (ids, tx) => {
    if (ids.length === 0) return []

    const idList = Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))
    const locked = await tx.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT id FROM products WHERE id IN (${idList}) ORDER BY id FOR UPDATE`,
    )

    if (locked.length === 0) return []

    return tx.product.findMany({
      where: { id: { in: locked.map((row) => row.id) } },
      orderBy: { id: 'asc' },
      include: categorySelect,
    })
  },

  findBySku: (sku) => prisma.product.findUnique({ where: { sku } }),

  findByBarcode: (barcode) => prisma.product.findUnique({ where: { barcode } }),

  create: (data, tx) =>
    (tx ?? prisma).product.create({
      data: {
        sku: data.sku,
        barcode: data.barcode,
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        unit: data.unit,
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice,
        stock: data.stock,
        minStock: data.minStock,
      },
      include: categorySelect,
    }),

  update: (id, data, tx) => {
    const update: Prisma.ProductUncheckedUpdateInput = {}

    if (data.sku !== undefined) update.sku = data.sku
    if (data.barcode !== undefined) update.barcode = data.barcode
    if (data.name !== undefined) update.name = data.name
    if (data.description !== undefined) update.description = data.description
    if (data.categoryId !== undefined) update.categoryId = data.categoryId
    if (data.unit !== undefined) update.unit = data.unit
    if (data.costPrice !== undefined) update.costPrice = data.costPrice
    if (data.sellingPrice !== undefined) update.sellingPrice = data.sellingPrice
    if (data.minStock !== undefined) update.minStock = data.minStock
    if (data.isActive !== undefined) update.isActive = data.isActive

    return (tx ?? prisma).product.update({ where: { id }, data: update, include: categorySelect })
  },

  updateStock: (id, stock, tx) =>
    (tx ?? prisma).product.update({
      where: { id },
      data: { stock },
      include: categorySelect,
    }),
})
