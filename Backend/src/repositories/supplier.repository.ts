import type { Prisma, PrismaClient, Supplier } from '@prisma/client'

export type SupplierView = Supplier & { _count: { purchaseOrders: number } }

export interface SupplierFilters {
  search?: string | undefined
  isActive?: boolean | undefined
}

export interface ListSuppliersInput extends SupplierFilters {
  skip: number
  take: number
}

export interface CreateSupplierData {
  name: string
  contact: string | null
  phone: string | null
  email: string | null
  address: string | null
}

export interface UpdateSupplierData {
  name?: string | undefined
  contact?: string | null | undefined
  phone?: string | null | undefined
  email?: string | null | undefined
  address?: string | null | undefined
  isActive?: boolean | undefined
}

export interface SupplierRepository {
  list: (input: ListSuppliersInput) => Promise<{ items: SupplierView[]; total: number }>
  findById: (id: string) => Promise<Supplier | null>
  findByName: (name: string, excludeId?: string) => Promise<Supplier | null>
  countPurchaseOrders: (supplierId: string) => Promise<number>
  create: (data: CreateSupplierData) => Promise<SupplierView>
  update: (id: string, data: UpdateSupplierData) => Promise<SupplierView>
  delete: (id: string) => Promise<Supplier>
}

const countSelect = { _count: { select: { purchaseOrders: true } } } as const

export const createSupplierRepository = (prisma: PrismaClient): SupplierRepository => ({
  list: async ({ skip, take, search, isActive }) => {
    const where: Prisma.SupplierWhereInput = {}

    if (isActive !== undefined) where.isActive = isActive

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contact: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: countSelect,
      }),
      prisma.supplier.count({ where }),
    ])

    return { items, total }
  },

  findById: (id) => prisma.supplier.findUnique({ where: { id } }),

  findByName: (name, excludeId) =>
    prisma.supplier.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    }),

  countPurchaseOrders: (supplierId) => prisma.purchaseOrder.count({ where: { supplierId } }),

  create: (data) =>
    prisma.supplier.create({
      data: {
        name: data.name,
        contact: data.contact,
        phone: data.phone,
        email: data.email,
        address: data.address,
      },
      include: countSelect,
    }),

  update: (id, data) => {
    const update: Prisma.SupplierUpdateInput = {}

    if (data.name !== undefined) update.name = data.name
    if (data.contact !== undefined) update.contact = data.contact
    if (data.phone !== undefined) update.phone = data.phone
    if (data.email !== undefined) update.email = data.email
    if (data.address !== undefined) update.address = data.address
    if (data.isActive !== undefined) update.isActive = data.isActive

    return prisma.supplier.update({ where: { id }, data: update, include: countSelect })
  },

  delete: (id) => prisma.supplier.delete({ where: { id } }),
})