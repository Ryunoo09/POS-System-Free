import type { User } from '@prisma/client'
import { ROLE_PERMISSIONS } from '../constants/permissions.js'
import type { Role } from '../constants/roles.js'
import type { AuthUser } from '../types/auth.js'

type UserRecord = Pick<User, 'id' | 'name' | 'email' | 'role'>

type UserAdminRecord = Pick<
  User,
  'id' | 'name' | 'email' | 'role' | 'isActive' | 'createdAt' | 'updatedAt'
>

export interface UserDto {
  id: string
  name: string
  email: string
  role: Role
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Satu-satunya tempat pembentukan DTO user. Tidak pernah mengeluarkan `passwordHash`.
 */
export const toAuthUser = (user: UserRecord): AuthUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  permissions: [...ROLE_PERMISSIONS[user.role]],
})

export const toUserDto = (user: UserAdminRecord): UserDto => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  is_active: user.isActive,
  created_at: user.createdAt.toISOString(),
  updated_at: user.updatedAt.toISOString(),
})
