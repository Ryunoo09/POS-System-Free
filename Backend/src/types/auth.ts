import type { Permission } from '../constants/permissions.js'
import type { Role } from '../constants/roles.js'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: Role
  permissions: Permission[]
}
