import { getRedisClient, type RedisClient } from '../config/redis.js'
import { logger } from '../utils/logger.js'
import { namespaceVersionKey, type CacheNamespace } from './cache-keys.js'

export type CachePing = 'ok' | 'disabled' | 'down'

/** TTL (detik) per resource — lihat docs/redis-implementation-plan.md §8. */
export const CACHE_TTL = {
  productBarcode: 600,
  productDetail: 600,
  productList: 60,
  categories: 3600,
  dashboard: 60,
  dashboardPast: 900,
  report: 300,
  reportPast: 3600,
  inventory: 60,
} as const

const ENVELOPE_VERSION = 1
const JITTER_RATIO = 0.1
const WARN_INTERVAL_MS = 60_000

export interface CacheService {
  readonly enabled: boolean
  getOrSet: <T>(key: string, ttlSeconds: number, loader: () => Promise<T>) => Promise<T>
  getOrSetVersioned: <T>(
    namespace: CacheNamespace,
    buildKey: (version: string) => string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ) => Promise<T>
  del: (...keys: string[]) => Promise<void>
  bumpVersion: (namespace: CacheNamespace) => Promise<void>
  currentVersion: (namespace: CacheNamespace) => Promise<string>
  ping: () => Promise<CachePing>
}

const jitteredTtl = (ttlSeconds: number): number =>
  Math.max(1, Math.round(ttlSeconds * (1 + (Math.random() * 2 - 1) * JITTER_RATIO)))

const serialize = (data: unknown): string => JSON.stringify({ v: ENVELOPE_VERSION, data })

/** Envelope dipakai agar hasil `null` (negative cache) tetap terbedakan dari cache miss. */
const deserialize = (raw: string): { hit: boolean; value: unknown } => {
  try {
    const parsed = JSON.parse(raw) as { v?: number; data?: unknown }

    if (parsed && typeof parsed === 'object' && parsed.v === ENVELOPE_VERSION) {
      return { hit: true, value: parsed.data ?? null }
    }

    return { hit: true, value: parsed ?? null }
  } catch {
    return { hit: false, value: null }
  }
}

export const createCacheService = (
  client: RedisClient | null = getRedisClient(),
): CacheService => {
  const inflight = new Map<string, Promise<unknown>>()
  let lastWarnAt = 0

  const warn = (message: string, error: unknown): void => {
    const now = Date.now()
    if (now - lastWarnAt < WARN_INTERVAL_MS) return
    lastWarnAt = now
    logger.warn(message, error instanceof Error ? error.message : error)
  }

  const read = async <T>(key: string): Promise<{ hit: boolean; value: T | null }> => {
    if (!client) return { hit: false, value: null }

    try {
      const raw = await client.get(key)
      if (raw === null) return { hit: false, value: null }

      const parsed = deserialize(raw)
      return { hit: parsed.hit, value: parsed.hit ? (parsed.value as T | null) : null }
    } catch (error) {
      warn('Gagal membaca cache', error)
      return { hit: false, value: null }
    }
  }

  const write = async (key: string, value: unknown, ttlSeconds: number): Promise<void> => {
    if (!client) return

    try {
      await client.set(key, serialize(value), 'EX', jitteredTtl(ttlSeconds))
    } catch (error) {
      warn('Gagal menulis cache', error)
    }
  }

  /** Single-flight per key agar cache stampede tertahan saat key populer kedaluwarsa. */
  const getOrSet = <T>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> => {
    const pending = inflight.get(key)
    if (pending) return pending as Promise<T>

    const promise = (async () => {
      const result = await read<T>(key)
      if (result.hit) return result.value as T

      const value = await loader()
      await write(key, value, ttlSeconds)
      return value
    })()

    inflight.set(key, promise)

    return promise.finally(() => {
      inflight.delete(key)
    })
  }

  const currentVersion = async (namespace: CacheNamespace): Promise<string> => {
    if (!client) return '0'

    try {
      return (await client.get(namespaceVersionKey(namespace))) ?? '0'
    } catch (error) {
      warn('Gagal membaca versi cache', error)
      return '0'
    }
  }

  return {
    enabled: client !== null,
    getOrSet,

    getOrSetVersioned: async (namespace, buildKey, ttlSeconds, loader) =>
      getOrSet(buildKey(await currentVersion(namespace)), ttlSeconds, loader),

    del: async (...keys) => {
      if (!client || keys.length === 0) return

      try {
        await client.del(...keys)
      } catch (error) {
        warn('Gagal menghapus cache', error)
      }
    },

    bumpVersion: async (namespace) => {
      if (!client) return

      try {
        await client.incr(namespaceVersionKey(namespace))
      } catch (error) {
        warn('Gagal menaikkan versi cache', error)
      }
    },

    currentVersion,

    ping: async () => {
      if (!client) return 'disabled'

      try {
        return (await client.ping()) === 'PONG' ? 'ok' : 'down'
      } catch {
        return 'down'
      }
    },
  }
}
