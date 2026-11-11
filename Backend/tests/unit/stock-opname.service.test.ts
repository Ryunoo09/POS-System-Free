import { Prisma } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import type { ProductRepository, ProductView } from '../../src/repositories/product.repository.js'
import type {
  OpnameDetailView,
  OpnameItemView,
  OpnameListRow,
  StockOpnameRepository,
} from '../../src/repositories/stock-opname.repository.js'
import { createStockOpnameService } from '../../src/services/stock-opname.service.js'
import type { CreateStockOpnameInput } from '../../src/validators/stock-opname.validator.js'

vi.mock('../../src/config/database.js', () => ({
  runInTransaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn({}),
}))

const buildProduct = (overrides: Partial<ProductView> = {}): ProductView => ({
  id: 'product-1',
  sku: 'MKN-001',
  barcode: null,
  name: 'Kopi Susu',
  description: null,
  categoryId: 'category-1',
  unit: 'pcs',
  costPrice: new Prisma.Decimal('2000.00'),
  averageCost: new Prisma.Decimal('2000.00'),
  sellingPrice: new Prisma.Decimal('3500.00'),
  stock: 10,
  minStock: 2,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  category: { id: 'category-1', name: 'Minuman' },
  ...overrides,
})

const buildItem = (overrides: Partial<OpnameItemView> = {}): OpnameItemView => ({
  id: 'item-1',
  sessionId: 'session-1',
  productId: 'product-1',
  skuSnapshot: 'MKN-001',
  barcodeSnapshot: null,
  nameSnapshot: 'Kopi Susu',
  systemStock: 10,
  physicalStock: null,
  difference: null,
  reason: null,
  countedById: null,
  countedAt: null,
  countedBy: null,
  ...overrides,
})

const buildDetail = (overrides: Partial<OpnameDetailView> = {}): OpnameDetailView => ({
  id: 'session-1',
  sessionNumber: 'OPN-20261111-ABCD1234',
  name: 'Opname Harian',
  status: 'DRAFT',
  scope: 'ALL',
  notes: null,
  rejectionReason: null,
  createdById: 'admin-1',
  approvedById: null,
  submittedAt: null,
  approvedAt: null,
  rejectedAt: null,
  completedAt: null,
  createdAt: new Date('2026-11-11T03:00:00Z'),
  updatedAt: new Date('2026-11-11T03:00:00Z'),
  createdBy: { id: 'admin-1', name: 'Admin' },
  approvedBy: null,
  items: [buildItem()],
  ...overrides,
})

const buildRow = (overrides: Partial<OpnameListRow> = {}): OpnameListRow => ({
  ...buildDetail(),
  totalItems: 1,
  countedItems: 0,
  ...overrides,
})

const baseInput: CreateStockOpnameInput = { name: 'Opname Harian', scope: 'ALL' }

const buildRepository = (
  options: {
    products?: Array<{
      id: string
      sku: string
      barcode: string | null
      name: string
      stock: number
    }>
    detail?: OpnameDetailView | null
    item?: OpnameItemView | null
    productStock?: number
  } = {},
) => {
  const products = options.products ?? [
    { id: 'product-1', sku: 'MKN-001', barcode: null, name: 'Kopi Susu', stock: 10 },
  ]

  const createSession = vi.fn(async () => buildDetail())
  const listSessions = vi.fn(async () => ({ items: [buildRow()], total: 1 }))
  const findById = vi.fn(async () =>
    options.detail === undefined ? buildDetail() : options.detail,
  )
  const findByIdForUpdate = vi.fn(async () =>
    options.detail === undefined ? buildDetail() : options.detail,
  )
  const updateSession = vi.fn(async (_id: string, data: Partial<OpnameDetailView>) =>
    buildDetail({ ...data } as Partial<OpnameDetailView>),
  )
  const findActiveProducts = vi.fn(async () => products)
  const findItem = vi.fn(async () =>
    options.item === undefined ? buildItem() : options.item,
  )
  const updateItem = vi.fn(async (_id: string, data: Partial<OpnameItemView>) =>
    buildItem({ ...data } as Partial<OpnameItemView>),
  )

  const stockOpnameRepository = {
    createSession,
    listSessions,
    findById,
    findByIdForUpdate,
    updateSession,
    findActiveProducts,
    findItem,
    updateItem,
  } as unknown as StockOpnameRepository

  const productRepository = {
    findByIdForUpdate: vi.fn(async () =>
      buildProduct({ stock: options.productStock ?? 10 }),
    ),
  } as unknown as ProductRepository

  return {
    service: createStockOpnameService({ stockOpnameRepository, productRepository }),
    createSession,
    listSessions,
    findActiveProducts,
    findItem,
    updateItem,
    updateSession,
  }
}

describe('stock opname service', () => {
  it('generates one item per active product in scope', async () => {
    const { service, createSession } = buildRepository({
      products: [
        { id: 'product-1', sku: 'MKN-001', barcode: '2000000000017', name: 'Kopi Susu', stock: 10 },
        { id: 'product-2', sku: 'MNM-002', barcode: null, name: 'Teh', stock: 4 },
      ],
    })

    await service.create(baseInput, { id: 'admin-1' })

    const [data] = createSession.mock.calls[0] as unknown as [
      { items: Array<{ productId: string; systemStock: number; barcodeSnapshot: string | null }> },
    ]
    expect(data.items).toHaveLength(2)
    expect(data.items[0]).toMatchObject({ productId: 'product-1', systemStock: 10 })
    expect(data.items[1]).toMatchObject({ productId: 'product-2', systemStock: 4 })
  })

  it('rejects create when scope has no active product', async () => {
    const { service, createSession } = buildRepository({ products: [] })

    await expect(service.create(baseInput, { id: 'admin-1' })).rejects.toMatchObject({
      code: 'NO_PRODUCTS_IN_SCOPE',
    })
    expect(createSession).not.toHaveBeenCalled()
  })

  it('filters products by category or explicit ids', async () => {
    const { service, findActiveProducts } = buildRepository()

    await service.create(
      { name: 'Opname Kategori', scope: 'CATEGORY', category_ids: ['category-1'] },
      { id: 'admin-1' },
    )
    expect(findActiveProducts).toHaveBeenLastCalledWith({
      productIds: undefined,
      categoryIds: ['category-1'],
    })

    await service.create(
      { name: 'Opname Produk', scope: 'PRODUCT', product_ids: ['product-1'] },
      { id: 'admin-1' },
    )
    expect(findActiveProducts).toHaveBeenLastCalledWith({
      productIds: ['product-1'],
      categoryIds: undefined,
    })
  })

  it('returns not found for a missing session', async () => {
    const { service } = buildRepository({ detail: null })

    await expect(service.detail('missing')).rejects.toMatchObject({ code: 'OPNAME_NOT_FOUND' })
  })

  it('summarizes counted and uncounted items on detail', async () => {
    const { service } = buildRepository({
      detail: buildDetail({
        items: [
          buildItem({ id: 'item-1', physicalStock: 12, difference: 2 }),
          buildItem({ id: 'item-2', physicalStock: 7, difference: -3 }),
          buildItem({ id: 'item-3', physicalStock: null, difference: null }),
        ],
      }),
    })

    const detail = await service.detail('session-1')

    expect(detail).toMatchObject({
      total_items: 3,
      counted_items: 2,
      uncounted_items: 1,
      positive_differences: 1,
      negative_differences: 1,
      zero_differences: 0,
      total_adjustment_quantity: -1,
    })
  })

  it('lists sessions with pagination meta', async () => {
    const { service } = buildRepository()

    const result = await service.list({ page: 1, limit: 10 })

    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      session_number: 'OPN-20261111-ABCD1234',
      total_items: 1,
    })
    expect(result.meta).toMatchObject({ page: 1, limit: 10, total_items: 1 })
  })

  it('starts only a DRAFT session', async () => {
    const { service, updateSession } = buildRepository({
      detail: buildDetail({ status: 'IN_PROGRESS' }),
    })

    await expect(service.start('session-1', { id: 'admin-1' })).rejects.toMatchObject({
      code: 'INVALID_OPNAME_STATUS',
    })
    expect(updateSession).not.toHaveBeenCalled()

    const draft = buildRepository({ detail: buildDetail({ status: 'DRAFT' }) })
    await draft.service.start('session-1', { id: 'admin-1' })
    expect(draft.updateSession).toHaveBeenCalledWith(
      'session-1',
      { status: 'IN_PROGRESS' },
      expect.anything(),
    )
  })

  it('records difference against locked product stock', async () => {
    const { service, updateItem } = buildRepository({
      detail: buildDetail({ status: 'IN_PROGRESS' }),
      productStock: 8,
    })

    const item = await service.updateItem(
      'session-1',
      'item-1',
      { physical_stock: 5, reason: 'Rusak' },
      { id: 'admin-1' },
    )

    expect(updateItem).toHaveBeenCalledWith(
      'item-1',
      expect.objectContaining({
        systemStock: 8,
        physicalStock: 5,
        difference: -3,
        reason: 'Rusak',
        countedById: 'admin-1',
      }),
      expect.anything(),
    )
    expect(item).toMatchObject({ difference: -3, physical_stock: 5 })
  })

  it('rejects counting when session is not IN_PROGRESS', async () => {
    const { service, updateItem } = buildRepository({ detail: buildDetail({ status: 'DRAFT' }) })

    await expect(
      service.updateItem('session-1', 'item-1', { physical_stock: 5 }, { id: 'admin-1' }),
    ).rejects.toMatchObject({ code: 'INVALID_OPNAME_STATUS' })
    expect(updateItem).not.toHaveBeenCalled()
  })

  it('rejects counting an item outside the session', async () => {
    const { service } = buildRepository({
      detail: buildDetail({ status: 'IN_PROGRESS' }),
      item: null,
    })

    await expect(
      service.updateItem('session-1', 'other-item', { physical_stock: 5 }, { id: 'admin-1' }),
    ).rejects.toMatchObject({ code: 'OPNAME_ITEM_NOT_FOUND' })
  })

  it('requires at least one counted item before submit', async () => {
    const { service, updateSession } = buildRepository({
      detail: buildDetail({
        status: 'IN_PROGRESS',
        items: [buildItem({ physicalStock: null })],
      }),
    })

    await expect(service.submit('session-1', { id: 'admin-1' })).rejects.toMatchObject({
      code: 'NOTHING_COUNTED',
    })
    expect(updateSession).not.toHaveBeenCalled()
  })

  it('submits a session with counted items', async () => {
    const { service, updateSession } = buildRepository({
      detail: buildDetail({
        status: 'IN_PROGRESS',
        items: [buildItem({ physicalStock: 9, difference: -1 })],
      }),
    })

    await service.submit('session-1', { id: 'admin-1' })

    expect(updateSession).toHaveBeenCalledWith(
      'session-1',
      expect.objectContaining({ status: 'SUBMITTED', submittedAt: expect.any(Date) }),
      expect.anything(),
    )
  })
})
