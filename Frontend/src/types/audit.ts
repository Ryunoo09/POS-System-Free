export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'CANCEL' | 'ADJUST' | 'RESTORE' | 'LOGIN'

export type AuditEntity =
  | 'PRODUCT'
  | 'USER'
  | 'TRANSACTION'
  | 'INVENTORY'
  | 'SHIFT'
  | 'RETURN'
  | 'BACKUP'

export interface AuditActor {
  id: string
  name: string
}

export interface AuditLog {
  id: string
  user: AuditActor | null
  action: AuditAction
  entity: AuditEntity
  entity_id: string
  old_value: unknown
  new_value: unknown
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface AuditLogParams {
  page: number
  limit: number
  user_id?: string
  action?: AuditAction
  entity?: AuditEntity
  start_date?: string
  end_date?: string
}