export const ROLES = {
  ADMIN: 'ADMIN',
  OWNER: 'OWNER',
  CASHIER: 'CASHIER',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

const roleValues: readonly string[] = Object.values(ROLES)

export const isRole = (value: unknown): value is Role =>
  typeof value === 'string' && roleValues.includes(value)
