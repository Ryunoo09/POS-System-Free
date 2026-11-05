export type Role = 'ADMIN' | 'OWNER' | 'CASHIER'

export type Permission =
  | 'dashboard:read'
  | 'product:read'
  | 'product:write'
  | 'category:read'
  | 'category:write'
  | 'inventory:read'
  | 'inventory:adjust'
  | 'transaction:create'
  | 'transaction:read:own'
  | 'transaction:read:all'
  | 'report:read'
  | 'user:manage'
  | 'cost-price:read'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: Role
  permissions: Permission[]
}

export interface AuthSession {
  token: string
  token_type: string
  expires_in: string
  user: AuthUser
}

export interface LoginPayload {
  email: string
  password: string
}
