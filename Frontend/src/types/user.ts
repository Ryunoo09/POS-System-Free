import type { Role } from './auth'
import type { ActiveFilter } from './product'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserFilterState {
  search: string
  role: '' | Role
  is_active: ActiveFilter
}

export interface UserListParams {
  page: number
  limit: number
  search?: string
  role?: Role
  is_active?: Exclude<ActiveFilter, ''>
}

export interface UserFormValues {
  name: string
  email: string
  password: string
  role: Role
}

export interface UserCreatePayload {
  name: string
  email: string
  password: string
  role: Role
}

export interface UserUpdatePayload {
  name?: string
  role?: Role
  is_active?: boolean
  password?: string
}