import type { User } from '@prisma/client'
import { ROLE_PERMISSIONS } from '../constants/permissions.js'
import type { AuthUser } from '../types/auth.js'

type UserRecord = Pick<User, 'id' | 'name' | 'email' | 'role'>

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
