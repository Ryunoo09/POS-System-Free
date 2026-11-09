import type { AuditLog, Prisma, PrismaClient } from '@prisma/client'
import type { AuditAction, AuditEntity } from '../constants/audit.js'

export type AuditLogView = AuditLog & { user: { id: string; name: string } | null }

export interface CreateAuditLogData {
  userId: string | null
  action: AuditAction
  entity: AuditEntity
  entityId: string
  oldValue?: unknown
  newValue?: unknown
  ipAddress?: string | null
  userAgent?: string | null
}

export interface AuditLogFilters {
  userId?: string | undefined
  action?: AuditAction | undefined
  entity?: AuditEntity | undefined
  startAt?: Date | undefined
  endAt?: Date | undefined
}

export interface ListAuditLogsInput extends AuditLogFilters {
  skip: number
  take: number
}

export interface AuditRepository {
  create: (data: CreateAuditLogData) => Promise<void>
  list: (input: ListAuditLogsInput) => Promise<{ items: AuditLogView[]; total: number }>
  listActorOptions: () => Promise<Array<{ id: string; name: string }>>
}

const include = { user: { select: { id: true, name: true } } } as const

export const createAuditRepository = (prisma: PrismaClient): AuditRepository => ({
  create: async (data) => {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        ...(data.oldValue !== undefined
          ? { oldValue: data.oldValue as Prisma.InputJsonValue }
          : {}),
        ...(data.newValue !== undefined
          ? { newValue: data.newValue as Prisma.InputJsonValue }
          : {}),
      },
    })
  },

  list: async ({ skip, take, userId, action, entity, startAt, endAt }) => {
    const where: Prisma.AuditLogWhereInput = {}

    if (userId !== undefined) where.userId = userId
    if (action !== undefined) where.action = action
    if (entity !== undefined) where.entity = entity

    if (startAt !== undefined || endAt !== undefined) {
      where.createdAt = {
        ...(startAt !== undefined ? { gte: startAt } : {}),
        ...(endAt !== undefined ? { lte: endAt } : {}),
      }
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include,
      }),
      prisma.auditLog.count({ where }),
    ])

    return { items, total }
  },

  listActorOptions: () =>
    prisma.user.findMany({
      where: { auditLogs: { some: {} } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
})
