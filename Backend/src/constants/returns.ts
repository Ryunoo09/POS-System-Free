export const RETURN_STATUSES = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  COMPLETED: 'COMPLETED',
} as const

export type ReturnStatus = (typeof RETURN_STATUSES)[keyof typeof RETURN_STATUSES]

export const RETURN_ACTIONS = {
  RESTOCK: 'RESTOCK',
  DAMAGED: 'DAMAGED',
} as const

export type ReturnAction = (typeof RETURN_ACTIONS)[keyof typeof RETURN_ACTIONS]