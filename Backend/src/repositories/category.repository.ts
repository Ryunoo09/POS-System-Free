import type { Category, PrismaClient } from '@prisma/client'

export type CategoryView = Category & { _count: { products: number } }

export interface CategoryFilters {
  search?: string | undefined
  isActive?: boolean | undefined
}

export interface ListCategoriesInput extends CategoryFilters {
  skip: number
  take: number
}

export interface CreateCategoryData {
  name: string
  description: string | null
}

export interface UpdateCategoryData {
  name?: string | undefined
  description?: string | null | undefined
  isActive?: boolean | undefined
}

export interface CategoryRepository {
  list: (input: ListCategoriesInput) => Promise<{ items: CategoryView[]; total: number }>
  findById: (id: string) => Promise<Category | null>
  findByName: (name: string, excludeId?: string) => Promise<Category | null>
  countProducts: (categoryId: string) => Promise<number>
  create: (data: CreateCategoryData) => Promise<CategoryView>
  update: (id: string, data: UpdateCategoryData) => Promise<CategoryView>
  delete: (id: string) => Promise<Category>
}

const countSelect = { _count: { select: { products: true } } } as const

export const createCategoryRepository = (prisma: PrismaClient): CategoryRepository => ({
  list: async ({ skip, take, search, isActive }) => {
    const where: { isActive?: boolean; name?: { contains: string; mode: 'insensitive' } } = {}

    if (isActive !== undefined) {
      where.isActive = isActive
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    const [items, total] = await Promise.all([
      prisma.category.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: countSelect,
      }),
      prisma.category.count({ where }),
    ])

    return { items, total }
  },

  findById: (id) => prisma.category.findUnique({ where: { id } }),

  findByName: (name, excludeId) =>
    prisma.category.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    }),

  countProducts: (categoryId) => prisma.product.count({ where: { categoryId } }),

  create: (data) =>
    prisma.category.create({
      data: { name: data.name, description: data.description },
      include: countSelect,
    }),

  update: (id, data) => {
    const update: { name?: string; description?: string | null; isActive?: boolean } = {}

    if (data.name !== undefined) update.name = data.name
    if (data.description !== undefined) update.description = data.description
    if (data.isActive !== undefined) update.isActive = data.isActive

    return prisma.category.update({ where: { id }, data: update, include: countSelect })
  },

  delete: (id) => prisma.category.delete({ where: { id } }),
})
