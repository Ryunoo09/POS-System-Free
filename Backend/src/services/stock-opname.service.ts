import { MAX_OPNAME_ITEMS } from '../constants/opname.js'
import { STOCK_MOVEMENT_TYPES, STOCK_REFERENCE_TYPES } from '../constants/stock.js'
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../constants/audit.js'
import { noopCache, type CacheService } from '../cache/cache.service.js'
import { runInTransaction } from '../config/database.js'
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../errors/app-errors.js'
import {
  toOpnameDetailDto,
  toOpnameItemDto,
  toOpnameListItemDto,
  type OpnameDetailDto,
  type OpnameItemDto,
  type OpnameListItemDto,
} from '../mappers/stock-opname.mapper.js'
import type { ProductRepository } from '../repositories/product.repository.js'
import type { StockMovementRepository } from '../repositories/stock-movement.repository.js'
import type {
  OpnameDetailView,
  OpnameTx,
  StockOpnameRepository,
} from '../repositories/stock-opname.repository.js'
import type { PaginationMeta } from '../types/http.js'
import { resolveDateRange } from '../utils/date-range.js'
import { formatOpnameSessionNumber } from '../utils/opname-number.js'
import { buildPaginationMeta, toSkip } from '../utils/pagination.js'
import type { AuditRecorder } from './audit.service.js'
import type {
  CreateStockOpnameInput,
  ListStockOpnamesQuery,
  RejectStockOpnameInput,
  UpdateStockOpnameItemInput,
} from '../validators/stock-opname.validator.js'

export interface OpnameActor {
  id: string
  ipAddress?: string | null
  userAgent?: string | null
}

export interface StockOpnameService {
  list: (query: ListStockOpnamesQuery) => Promise<{
    items: OpnameListItemDto[]
    meta: PaginationMeta
  }>
  create: (input: CreateStockOpnameInput, actor: OpnameActor) => Promise<OpnameDetailDto>
  detail: (id: string) => Promise<OpnameDetailDto>
  start: (id: string, actor: OpnameActor) => Promise<OpnameDetailDto>
  updateItem: (
    sessionId: string,
    itemId: string,
    input: UpdateStockOpnameItemInput,
    actor: OpnameActor,
  ) => Promise<OpnameItemDto>
  submit: (id: string, actor: OpnameActor) => Promise<OpnameDetailDto>
  approve: (id: string, actor: OpnameActor) => Promise<OpnameDetailDto>
  reject: (
    id: string,
    input: RejectStockOpnameInput,
    actor: OpnameActor,
  ) => Promise<OpnameDetailDto>
  complete: (id: string, actor: OpnameActor) => Promise<OpnameDetailDto>
  cancel: (id: string, actor: OpnameActor) => Promise<OpnameDetailDto>
}

export const createStockOpnameService = ({
  stockOpnameRepository,
  productRepository,
  stockMovementRepository,
  audit,
  cache = noopCache,
}: {
  stockOpnameRepository: StockOpnameRepository
  productRepository: ProductRepository
  stockMovementRepository: StockMovementRepository
  audit?: AuditRecorder
  cache?: CacheService
}): StockOpnameService => {
  const findDetailOrFail = async (id: string): Promise<OpnameDetailDto> => {
    const session = await stockOpnameRepository.findById(id)

    if (!session) {
      throw new NotFoundError('Sesi opname tidak ditemukan', 'OPNAME_NOT_FOUND')
    }

    return toOpnameDetailDto(session)
  }

  const lockSessionOrFail = async (
    id: string,
    tx: OpnameTx,
  ): Promise<OpnameDetailView> => {
    const session = await stockOpnameRepository.findByIdForUpdate(id, tx)

    if (!session) {
      throw new NotFoundError('Sesi opname tidak ditemukan', 'OPNAME_NOT_FOUND')
    }

    return session
  }

  const assertStatus = (
    session: OpnameDetailView,
    expected: OpnameDetailView['status'],
  ): void => {
    if (session.status !== expected) {
      throw new ConflictError(
        `Status sesi harus ${expected} untuk aksi ini (status saat ini ${session.status})`,
        'INVALID_OPNAME_STATUS',
      )
    }
  }

  const assertStatusIn = (
    session: OpnameDetailView,
    allowed: ReadonlyArray<OpnameDetailView['status']>,
  ): void => {
    if (!allowed.includes(session.status)) {
      throw new ConflictError(
        `Status sesi harus salah satu dari ${allowed.join(', ')} untuk aksi ini (status saat ini ${session.status})`,
        'INVALID_OPNAME_STATUS',
      )
    }
  }

  const auditRecord = (
    actor: OpnameActor,
    action: (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS],
    session: { id: string },
    newValue: unknown,
  ) =>
    audit?.record({
      userId: actor.id,
      action,
      entity: AUDIT_ENTITIES.STOCK_OPNAME,
      entityId: session.id,
      newValue,
      ipAddress: actor.ipAddress ?? null,
      userAgent: actor.userAgent ?? null,
    })

  return {
    list: async (query) => {
      const range =
        query.start_date !== undefined || query.end_date !== undefined
          ? resolveDateRange({ start_date: query.start_date, end_date: query.end_date })
          : null

      const { items, total } = await stockOpnameRepository.listSessions({
        skip: toSkip(query.page, query.limit),
        take: query.limit,
        status: query.status,
        scope: query.scope,
        createdById: query.created_by,
        startAt: range?.startAt,
        endAt: range?.endAt,
      })

      return {
        items: items.map(toOpnameListItemDto),
        meta: buildPaginationMeta(query.page, query.limit, total),
      }
    },

    create: async (input, actor) => {
      const products = await stockOpnameRepository.findActiveProducts({
        productIds: input.scope === 'PRODUCT' ? input.product_ids : undefined,
        categoryIds: input.scope === 'CATEGORY' ? input.category_ids : undefined,
      })

      if (products.length === 0) {
        throw new BusinessRuleError(
          'Tidak ada produk aktif pada cakupan opname',
          'NO_PRODUCTS_IN_SCOPE',
        )
      }

      if (products.length > MAX_OPNAME_ITEMS) {
        throw new BusinessRuleError(
          `Cakupan opname melebihi batas ${MAX_OPNAME_ITEMS} produk`,
          'TOO_MANY_OPNAME_ITEMS',
        )
      }

      const created = await runInTransaction((tx) =>
        stockOpnameRepository.createSession(
          {
            session: {
              sessionNumber: formatOpnameSessionNumber(),
              name: input.name,
              scope: input.scope,
              notes: input.notes ?? null,
              createdById: actor.id,
            },
            items: products.map((product) => ({
              productId: product.id,
              skuSnapshot: product.sku,
              barcodeSnapshot: product.barcode,
              nameSnapshot: product.name,
              systemStock: product.stock,
            })),
          },
          tx,
        ),
      )

      await auditRecord(actor, AUDIT_ACTIONS.CREATE, created, {
        session_number: created.sessionNumber,
        scope: created.scope,
        total_items: products.length,
      })

      return findDetailOrFail(created.id)
    },

    detail: findDetailOrFail,

    start: async (id, actor) => {
      const updated = await runInTransaction(async (tx) => {
        const session = await lockSessionOrFail(id, tx)
        assertStatus(session, 'DRAFT')

        return stockOpnameRepository.updateSession(id, { status: 'IN_PROGRESS' }, tx)
      })

      await auditRecord(actor, AUDIT_ACTIONS.UPDATE, updated, { status: updated.status })

      return findDetailOrFail(id)
    },

    updateItem: async (sessionId, itemId, input, actor) => {
      const item = await runInTransaction(async (tx) => {
        const session = await lockSessionOrFail(sessionId, tx)
        assertStatus(session, 'IN_PROGRESS')

        const existing = await stockOpnameRepository.findItem(sessionId, itemId, tx)

        if (!existing) {
          throw new NotFoundError('Item opname tidak ditemukan', 'OPNAME_ITEM_NOT_FOUND')
        }

        const product = await productRepository.findByIdForUpdate(existing.productId, tx)

        if (!product) {
          throw new NotFoundError('Produk item opname tidak ditemukan', 'PRODUCT_NOT_FOUND')
        }

        // Snapshot stok sistem saat hitung di bawah row lock produk (§4.1).
        const systemStock = product.stock

        return stockOpnameRepository.updateItem(
          itemId,
          {
            systemStock,
            physicalStock: input.physical_stock,
            difference: input.physical_stock - systemStock,
            reason: input.reason ?? null,
            countedById: actor.id,
            countedAt: new Date(),
          },
          tx,
        )
      })

      return toOpnameItemDto(item)
    },

    submit: async (id, actor) => {
      const updated = await runInTransaction(async (tx) => {
        const session = await lockSessionOrFail(id, tx)
        assertStatus(session, 'IN_PROGRESS')

        const counted = session.items.filter((item) => item.physicalStock !== null).length

        if (counted === 0) {
          throw new BusinessRuleError(
            'Belum ada item yang dihitung',
            'NOTHING_COUNTED',
          )
        }

        return stockOpnameRepository.updateSession(id, { status: 'SUBMITTED', submittedAt: new Date() }, tx)
      })

      await auditRecord(actor, AUDIT_ACTIONS.UPDATE, updated, { status: updated.status })

      return findDetailOrFail(id)
    },

    approve: async (id, actor) => {
      const result = await runInTransaction(async (tx) => {
        const session = await lockSessionOrFail(id, tx)
        assertStatus(session, 'SUBMITTED')

        if (session.createdById === actor.id) {
          throw new ForbiddenError(
            'Tidak boleh menyetujui sesi opname yang dibuat sendiri',
            'SELF_APPROVAL_FORBIDDEN',
          )
        }

        const counted = session.items.filter(
          (item): item is typeof item & { physicalStock: number } => item.physicalStock !== null,
        )

        const products = await productRepository.findManyByIdsForUpdate(
          counted.map((item) => item.productId),
          tx,
        )
        const productById = new Map(products.map((product) => [product.id, product]))
        let adjustments = 0

        for (const item of counted) {
          const product = productById.get(item.productId)

          if (!product) {
            throw new NotFoundError(
              `Produk item opname tidak ditemukan (${item.skuSnapshot})`,
              'PRODUCT_NOT_FOUND',
            )
          }

          const stockBefore = product.stock
          const stockAfter = item.physicalStock

          if (stockAfter === stockBefore) continue

          await productRepository.updateStock(product.id, stockAfter, tx)
          await stockMovementRepository.create(
            {
              productId: product.id,
              movementType: STOCK_MOVEMENT_TYPES.ADJUSTMENT,
              quantity: stockAfter - stockBefore,
              stockBefore,
              stockAfter,
              referenceType: STOCK_REFERENCE_TYPES.STOCK_OPNAME,
              referenceId: session.id,
              notes: `Opname ${session.sessionNumber}${item.reason ? `: ${item.reason}` : ''}`,
              createdById: actor.id,
            },
            tx,
          )
          adjustments += 1
        }

        const updated = await stockOpnameRepository.updateSession(
          id,
          { status: 'APPROVED', approvedById: actor.id, approvedAt: new Date() },
          tx,
        )

        return { updated, adjustments }
      })

      await auditRecord(actor, AUDIT_ACTIONS.ADJUST, result.updated, {
        status: result.updated.status,
        adjustments: result.adjustments,
      })

      // Opname yang menyetujui selisih stok mengubah inventory.
      if (result.adjustments > 0) await cache.bumpVersion('inventory')

      return findDetailOrFail(id)
    },

    reject: async (id, input, actor) => {
      const updated = await runInTransaction(async (tx) => {
        const session = await lockSessionOrFail(id, tx)
        assertStatus(session, 'SUBMITTED')

        return stockOpnameRepository.updateSession(
          id,
          {
            status: 'IN_PROGRESS',
            rejectionReason: input.reason,
            rejectedAt: new Date(),
            submittedAt: null,
          },
          tx,
        )
      })

      await auditRecord(actor, AUDIT_ACTIONS.UPDATE, updated, {
        status: updated.status,
        reason: input.reason,
      })

      return findDetailOrFail(id)
    },

    complete: async (id, actor) => {
      const updated = await runInTransaction(async (tx) => {
        const session = await lockSessionOrFail(id, tx)
        assertStatus(session, 'APPROVED')

        return stockOpnameRepository.updateSession(
          id,
          { status: 'COMPLETED', completedAt: new Date() },
          tx,
        )
      })

      await auditRecord(actor, AUDIT_ACTIONS.UPDATE, updated, { status: updated.status })

      return findDetailOrFail(id)
    },

    cancel: async (id, actor) => {
      const updated = await runInTransaction(async (tx) => {
        const session = await lockSessionOrFail(id, tx)
        assertStatusIn(session, ['DRAFT', 'IN_PROGRESS', 'REJECTED'])

        return stockOpnameRepository.updateSession(id, { status: 'CANCELLED' }, tx)
      })

      await auditRecord(actor, AUDIT_ACTIONS.CANCEL, updated, { status: updated.status })

      return findDetailOrFail(id)
    },
  }
}
