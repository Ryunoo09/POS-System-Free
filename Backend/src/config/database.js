import { PrismaClient } from '@prisma/client'
import { env } from './env.js'

export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
})

export const runInTransaction = (fn, options = {}) =>
  prisma.$transaction(fn, {
    maxWait: 5_000,
    timeout: 10_000,
    ...options,
  })
