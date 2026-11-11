import { MAX_OPNAME_ITEMS } from '../constants/opname.js'
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../constants/audit.js'
import { runInTransaction } from '../config/database.js'
import { BusinessRuleError, NotFoundError } from '../errors/app-errors.js'
import {
  toOpnameDetailDto,
  toOpnameListItemDto,
  type OpnameDetailDto,
  type OpnameListItemDto,
} from '../mappers/stock-opname.mapper.js'
import type { StockOpnameRepository } from '../repositories/stock-opname.repository.js'
import type { PaginationMeta } from '../types/http.js'
import { resolveDateRange } from '../utils/date-range.js'
import { formatOpnameSessionNumber } from '../utils/opname-number.js'
import { buildPaginationMeta, toSkip } from '../utils/pagination.js'
import type { AuditRecorder } from './audit.service.js'
import type {
  CreateStockOpnameInput,
  ListStockOpnamesQuery,
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
}

export const createStockOpnameService = ({
  stockOpnameRepository,
  audit,
}: {
  stockOpnameRepository: StockOpnameRepository
  audit?: AuditRecorder
}): StockOpnameService => {
  const findDetailOrFail = async (id: string): Promise<OpnameDetailDto> => {
    const session = await stockOpnameRepository.findById(id)

    if (!session) {
      throw new NotFoundError('Sesi opname tidak ditemukan', 'OPNAME_NOT_FOUND')
    }

    return toOpnameDetailDto(session)
  }

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

      await audit?.record({
        userId: actor.id,
        action: AUDIT_ACTIONS.CREATE,
        entity: AUDIT_ENTITIES.STOCK_OPNAME,
        entityId: created.id,
        newValue: {
          session_number: created.sessionNumber,
          scope: created.scope,
          total_items: products.length,
        },
        ipAddress: actor.ipAddress ?? null,
        userAgent: actor.userAgent ?? null,
      })

      return findDetailOrFail(created.id)
    },

    detail: findDetailOrFail,
  }
}
