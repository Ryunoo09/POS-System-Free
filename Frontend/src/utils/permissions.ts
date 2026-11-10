import type { Permission } from '@/types/auth'

export const PERMISSIONS = {
  DASHBOARD_READ: 'dashboard:read',
  PRODUCT_READ: 'product:read',
  PRODUCT_WRITE: 'product:write',
  CATEGORY_READ: 'category:read',
  CATEGORY_WRITE: 'category:write',
  INVENTORY_READ: 'inventory:read',
  INVENTORY_ADJUST: 'inventory:adjust',
  TRANSACTION_CREATE: 'transaction:create',
  TRANSACTION_READ_OWN: 'transaction:read:own',
  TRANSACTION_READ_ALL: 'transaction:read:all',
  REPORT_READ: 'report:read',
  USER_MANAGE: 'user:manage',
  COST_PRICE_READ: 'cost-price:read',
  SHIFT_MANAGE: 'shift:manage',
  SHIFT_READ: 'shift:read',
  AUDIT_READ: 'audit:read',
  RETURN_CREATE: 'return:create',
  RETURN_READ: 'return:read',
  SUPPLIER_READ: 'supplier:read',
  SUPPLIER_WRITE: 'supplier:write',
  PURCHASE_READ: 'purchase:read',
  PURCHASE_WRITE: 'purchase:write',
} as const satisfies Record<string, Permission>

export const hasPermission = (granted: readonly string[], permission: string): boolean =>
  granted.includes(permission)

export const hasAnyPermission = (
  granted: readonly string[],
  required: readonly string[],
): boolean => required.some((permission) => granted.includes(permission))
