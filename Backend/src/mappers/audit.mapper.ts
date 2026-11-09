import type { AuditLogView } from '../repositories/audit.repository.js'

export interface AuditLogDto {
  id: string
  user: { id: string; name: string } | null
  action: string
  entity: string
  entity_id: string
  old_value: unknown
  new_value: unknown
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export const toAuditLogDto = (log: AuditLogView): AuditLogDto => ({
  id: log.id,
  user: log.user ? { id: log.user.id, name: log.user.name } : null,
  action: log.action,
  entity: log.entity,
  entity_id: log.entityId,
  old_value: log.oldValue ?? null,
  new_value: log.newValue ?? null,
  ip_address: log.ipAddress,
  user_agent: log.userAgent,
  created_at: log.createdAt.toISOString(),
})