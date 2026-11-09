export const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  CANCEL: 'CANCEL',
  ADJUST: 'ADJUST',
  LOGIN: 'LOGIN',
} as const

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS]

export const AUDIT_ENTITIES = {
  PRODUCT: 'PRODUCT',
  USER: 'USER',
  TRANSACTION: 'TRANSACTION',
  INVENTORY: 'INVENTORY',
  SHIFT: 'SHIFT',
} as const

export type AuditEntity = (typeof AUDIT_ENTITIES)[keyof typeof AUDIT_ENTITIES]
