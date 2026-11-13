import { Redis } from 'ioredis'
import { logger } from '../utils/logger.js'
import { env } from './env.js'

export type RedisClient = Redis

let client: Redis | null = null
let warned = false

export const isRedisEnabled = (): boolean => env.REDIS_ENABLED

/**
 * Klien Redis tunggal untuk seluruh proses.
 *
 * Selalu mengembalikan `null` bila `REDIS_ENABLED=false` atau Redis tidak dapat
 * dihubungi, sehingga pemanggil dapat fallback ke PostgreSQL.
 */
export const getRedisClient = (): RedisClient | null => {
  if (!env.REDIS_ENABLED) return null
  if (client) return client

  client = new Redis(env.REDIS_URL, {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 2_000,
    commandTimeout: 500,
    retryStrategy: (attempt: number) => Math.min(attempt * 200, 2_000),
  })

  client.on('error', (error: Error) => {
    if (warned) return
    warned = true
    logger.warn('Redis bermasalah, cache dilewati', error.message)
  })

  client.on('ready', () => {
    warned = false
  })

  return client
}

export const closeRedis = async (): Promise<void> => {
  const current = client
  client = null
  if (!current) return

  try {
    await current.quit()
  } catch {
    current.disconnect()
  }
}
