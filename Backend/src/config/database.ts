import { PrismaClient, type Prisma } from '@prisma/client'
import { env } from './env.js'

export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
})

export interface TransactionOptions {
  maxWait?: number
  timeout?: number
}

export const runInTransaction = <T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options: TransactionOptions = {},
): Promise<T> =>
  prisma.$transaction(fn, {
    maxWait: 5_000,
    timeout: 10_000,
    ...options,
  })
