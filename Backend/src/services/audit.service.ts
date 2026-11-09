import type { AuditAction, AuditEntity } from '../constants/audit.js'
import { toAuditLogDto, type AuditLogDto } from '../mappers/audit.mapper.js'
import type { AuditRepository } from '../repositories/audit.repository.js'
import type { PaginationMeta } from '../types/http.js'
import { resolveDateRange } from '../utils/date-range.js'
import { buildPaginationMeta, toSkip } from '../utils/pagination.js'
import type { ListAuditLogsQuery } from '../validators/audit.validator.js'

export interface RecordAuditInput {
  userId: string | null
  action: AuditAction
  entity: AuditEntity
  entityId: string
  oldValue?: unknown
  newValue?: unknown
  ipAddress?: string | null | undefined
  userAgent?: string | null | undefined
}

export interface AuditRecorder {
  record: (input: RecordAuditInput) => Promise<void>
}

export interface AuditService extends AuditRecorder {
  list: (query: ListAuditLogsQuery) => Promise<{ items: AuditLogDto[]; meta: PaginationMeta }>
  listActors: () => Promise<Array<{ id: string; name: string }>>
}

export const createAuditService = (auditRepository: AuditRepository): AuditService => ({
  record: async (input) => {
    try {
      await auditRepository.create({
        ...input,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      })
    } catch (error) {
      // ponytail: audit bersifat best-effort agar kegagalan log tidak membatalkan
      // operasi bisnis. Pindahkan ke transaksi bisnis bila butuh jaminan keras.
      console.error('[audit] gagal mencatat log aktivitas', error)
    }
  },

  list: async (query) => {
    const range =
      query.start_date !== undefined || query.end_date !== undefined
        ? resolveDateRange({ start_date: query.start_date, end_date: query.end_date })
        : null

    const { items, total } = await auditRepository.list({
      skip: toSkip(query.page, query.limit),
      take: query.limit,
      userId: query.user_id,
      action: query.action,
      entity: query.entity,
      startAt: range?.startAt,
      endAt: range?.endAt,
    })

    return {
      items: items.map(toAuditLogDto),
      meta: buildPaginationMeta(query.page, query.limit, total),
    }
  },

  listActors: () => auditRepository.listActorOptions(),
})