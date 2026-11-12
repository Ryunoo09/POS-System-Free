import type { PrismaClient, User } from '@prisma/client'
import type { Role } from '../constants/roles.js'

export interface UserFilters {
  search?: string | undefined
  role?: Role | undefined
  isActive?: boolean | undefined
}

export interface ListUsersInput extends UserFilters {
  skip: number
  take: number
}

export interface CreateUserData {
  name: string
  email: string
  passwordHash: string
  role: Role
}

export interface UpdateUserData {
  name?: string | undefined
  role?: Role | undefined
  isActive?: boolean | undefined
  passwordHash?: string | undefined
  incrementTokenVersion?: boolean | undefined
}

export interface UserRepository {
  findByEmail: (email: string) => Promise<User | null>
  findById: (id: string) => Promise<User | null>
  findActiveById: (id: string) => Promise<User | null>
  list: (input: ListUsersInput) => Promise<{ items: User[]; total: number }>
  countActiveAdmins: () => Promise<number>
  create: (data: CreateUserData) => Promise<User>
  update: (id: string, data: UpdateUserData) => Promise<User>
  incrementTokenVersion: (id: string) => Promise<void>
}

export const createUserRepository = (prisma: PrismaClient): UserRepository => ({
  findByEmail: (email) => prisma.user.findUnique({ where: { email } }),

  findById: (id) => prisma.user.findUnique({ where: { id } }),

  findActiveById: (id) => prisma.user.findFirst({ where: { id, isActive: true } }),

  list: async ({ skip, take, search, role, isActive }) => {
    const where: {
      role?: Role
      isActive?: boolean
      OR?: Array<Record<string, { contains: string; mode: 'insensitive' }>>
    } = {}

    if (role !== undefined) where.role = role
    if (isActive !== undefined) where.isActive = isActive

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({ where, skip, take, orderBy: { name: 'asc' } }),
      prisma.user.count({ where }),
    ])

    return { items, total }
  },

  countActiveAdmins: () => prisma.user.count({ where: { role: 'ADMIN', isActive: true } }),

  create: (data) =>
    prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
      },
    }),

  update: (id, data) => {
    const update: {
      name?: string
      role?: Role
      isActive?: boolean
      passwordHash?: string
      tokenVersion?: { increment: number }
    } = {}

    if (data.name !== undefined) update.name = data.name
    if (data.role !== undefined) update.role = data.role
    if (data.isActive !== undefined) update.isActive = data.isActive
    if (data.passwordHash !== undefined) update.passwordHash = data.passwordHash
    if (data.incrementTokenVersion) update.tokenVersion = { increment: 1 }

    return prisma.user.update({ where: { id }, data: update })
  },

  incrementTokenVersion: (id) =>
    prisma.user
      .update({ where: { id }, data: { tokenVersion: { increment: 1 } } })
      .then(() => undefined),
})
