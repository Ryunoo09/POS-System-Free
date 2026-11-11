import { describe, expect, it, vi } from 'vitest'
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

const buildRepository = (options: {
  products?: Array<{ id: string; sku: string; barcode: string | null; name: string; stock: number }>
  detail?: OpnameDetailView | null
} = {}) => {
  const products =
    options.products ?? [
      { id: 'product-1', sku: 'MKN-001', barcode: null, name: 'Kopi Susu', stock: 10 },
    ]

  const createSession = vi.fn(async () => buildDetail())
  const listSessions = vi.fn(async () => ({ items: [buildRow()], total: 1 }))
  const findById = vi.fn(async () => (options.detail === undefined ? buildDetail() : options.detail))
  const findByIdForUpdate = vi.fn(async () =>
    options.detail === undefined ? buildDetail() : options.detail,
  )
  const updateSession = vi.fn(async () => buildDetail())
  const findActiveProducts = vi.fn(async () => products)

  const stockOpnameRepository = {
    createSession,
    listSessions,
    findById,
    findByIdForUpdate,
    updateSession,
    findActiveProducts,
  } as unknown as StockOpnameRepository

  return { stockOpnameRepository, createSession, listSessions, findById, findActiveProducts }
}

describe('stock opname service', () => {
  it('generates one item per active product in scope', async () => {
    const { stockOpnameRepository, createSession } = buildRepository({
      products: [
        { id: 'product-1', sku: 'MKN-001', barcode: '2000000000017', name: 'Kopi Susu', stock: 10 },
        { id: 'product-2', sku: 'MNM-002', barcode: null, name: 'Teh', stock: 4 },
      ],
    })
    const service = createStockOpnameService({ stockOpnameRepository })

    await service.create(baseInput, { id: 'admin-1' })

    const [data] = createSession.mock.calls[0] as unknown as [
      { items: Array<{ productId: string; systemStock: number; barcodeSnapshot: string | null }> },
    ]
    expect(data.items).toHaveLength(2)
    expect(data.items[0]).toMatchObject({ productId: 'product-1', systemStock: 10 })
    expect(data.items[1]).toMatchObject({ productId: 'product-2', systemStock: 4 })
  })

  it('rejects create when scope has no active product', async () => {
    const { stockOpnameRepository, createSession } = buildRepository({ products: [] })
    const service = createStockOpnameService({ stockOpnameRepository })

    await expect(service.create(baseInput, { id: 'admin-1' })).rejects.toMatchObject({
      code: 'NO_PRODUCTS_IN_SCOPE',
    })
    expect(createSession).not.toHaveBeenCalled()
  })

  it('filters products by category or explicit ids', async () => {
    const { stockOpnameRepository, findActiveProducts } = buildRepository()
    const service = createStockOpnameService({ stockOpnameRepository })

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
    const { stockOpnameRepository } = buildRepository({ detail: null })
    const service = createStockOpnameService({ stockOpnameRepository })

    await expect(service.detail('missing')).rejects.toMatchObject({ code: 'OPNAME_NOT_FOUND' })
  })

  it('summarizes counted and uncounted items on detail', async () => {
    const { stockOpnameRepository } = buildRepository({
      detail: buildDetail({
        items: [
          buildItem({ id: 'item-1', physicalStock: 12, difference: 2 }),
          buildItem({ id: 'item-2', physicalStock: 7, difference: -3 }),
          buildItem({ id: 'item-3', physicalStock: null, difference: null }),
        ],
      }),
    })
    const service = createStockOpnameService({ stockOpnameRepository })

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
    const { stockOpnameRepository } = buildRepository()
    const service = createStockOpnameService({ stockOpnameRepository })

    const result = await service.list({ page: 1, limit: 10 })

    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({ session_number: 'OPN-20261111-ABCD1234', total_items: 1 })
    expect(result.meta).toMatchObject({ page: 1, limit: 10, total_items: 1 })
  })
})
