import type { PrismaClient } from '@prisma/client'

export interface HealthRepository {
  ping: () => Promise<unknown>
}

export const createHealthRepository = (prisma: PrismaClient): HealthRepository => ({
  ping: () => prisma.$queryRaw`SELECT 1`,
})
