import { Prisma } from '@prisma/client'
import type {
  PrismaClient,
  Product,
  PurchaseOrder,
  PurchaseOrderItem,
  Supplier,
  User,
} from '@prisma/client'
import type { PurchaseOrderStatus } from '../constants/purchasing.js'

export type PurchaseOrderView = PurchaseOrder & {
  supplier: Pick<Supplier, 'id' | 'name'>
  createdBy: Pick<User, 'id' | 'name'>
  items: Array<PurchaseOrderItem & { product: Pick<Product, 'id' | 'sku' | 'name'> }>
}

export interface PurchaseOrderFilters {
  status?: PurchaseOrderStatus | undefined
  supplierId?: string | undefined
  search?: string | undefined
}

export interface ListPurchaseOrdersInput extends PurchaseOrderFilters {
  skip: number
  take: number
}

export interface CreatePurchaseOrderItemData {
  productId: string
  productName: string
  quantity: number
  costPrice: string
  subtotal: string
}

export interface CreatePurchaseOrderData {
  poNumber: string
  supplierId: string
  totalAmount: string
  notes: string | null
  createdById: string
  items: CreatePurchaseOrderItemData[]
}

export interface UpdatePurchaseOrderStatusData {
  status: PurchaseOrderStatus
  orderedAt?: Date | undefined
  receivedAt?: Date | undefined
}

export interface PurchaseOrderRepository {
  create: (
    data: CreatePurchaseOrderData,
    tx?: Prisma.TransactionClient,
  ) => Promise<PurchaseOrderView>
  findById: (id: string) => Promise<PurchaseOrderView | null>
  list: (input: ListPurchaseOrdersInput) => Promise<{ items: PurchaseOrderView[]; total: number }>
  updateStatus: (
    id: string,
    data: UpdatePurchaseOrderStatusData,
    tx?: Prisma.TransactionClient,
  ) => Promise<PurchaseOrderView>
}

const purchaseInclude = {
  supplier: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  items: {
    include: { product: { select: { id: true, sku: true, name: true } } },
    orderBy: { productName: 'asc' },
  },
} as const

export const createPurchaseOrderRepository = (
  prisma: PrismaClient,
): PurchaseOrderRepository => ({
  create: (data, tx) =>
    (tx ?? prisma).purchaseOrder.create({
      data: {
        poNumber: data.poNumber,
        supplierId: data.supplierId,
        totalAmount: new Prisma.Decimal(data.totalAmount),
        notes: data.notes,
        createdById: data.createdById,
        status: 'DRAFT',
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            costPrice: new Prisma.Decimal(item.costPrice),
            subtotal: new Prisma.Decimal(item.subtotal),
          })),
        },
      },
      include: purchaseInclude,
    }),

  findById: (id) =>
    prisma.purchaseOrder.findUnique({ where: { id }, include: purchaseInclude }),

  list: async ({ skip, take, status, supplierId, search }) => {
    const where: Prisma.PurchaseOrderWhereInput = {}

    if (status !== undefined) where.status = status
    if (supplierId !== undefined) where.supplierId = supplierId

    if (search) {
      where.OR = [
        { poNumber: { contains: search, mode: 'insensitive' } },
        { supplier: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: purchaseInclude,
      }),
      prisma.purchaseOrder.count({ where }),
    ])

    return { items, total }
  },

  updateStatus: (id, data, tx) =>
    (tx ?? prisma).purchaseOrder.update({
      where: { id },
      data: {
        status: data.status,
        ...(data.orderedAt !== undefined ? { orderedAt: data.orderedAt } : {}),
        ...(data.receivedAt !== undefined ? { receivedAt: data.receivedAt } : {}),
      },
      include: purchaseInclude,
    }),
})