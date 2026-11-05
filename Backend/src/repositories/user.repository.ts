import type { PrismaClient, User } from '@prisma/client'

export interface UserRepository {
  findByEmail: (email: string) => Promise<User | null>
  findActiveById: (id: string) => Promise<User | null>
}

export const createUserRepository = (prisma: PrismaClient): UserRepository => ({
  findByEmail: (email) => prisma.user.findUnique({ where: { email } }),
  findActiveById: (id) => prisma.user.findFirst({ where: { id, isActive: true } }),
})
