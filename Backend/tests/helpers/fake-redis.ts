import type { RedisClient } from '../../src/config/redis.js'

export interface FakeRedis {
  status: string
  store: Map<string, string>
  ttls: number[]
  set: (key: string, value: string, mode: string, ttlSeconds: number) => Promise<'OK'>
  get: (key: string) => Promise<string | null>
  incr: (key: string) => Promise<number>
  del: (...keys: string[]) => Promise<number>
  ping: () => Promise<string>
  off: () => void
  once: () => void
}

export const createFakeRedis = (options: { status?: string } = {}): FakeRedis => {
  const store = new Map<string, string>()
  const ttls: number[] = []

  return {
    status: options.status ?? 'ready',
    store,
    ttls,
    set: async (key, value, _mode, ttlSeconds) => {
      ttls.push(ttlSeconds)
      store.set(key, value)
      return 'OK'
    },
    get: async (key) => store.get(key) ?? null,
    incr: async (key) => {
      const next = Number(store.get(key) ?? 0) + 1
      store.set(key, String(next))
      return next
    },
    del: async (...keys) => {
      let removed = 0
      for (const key of keys) {
        if (store.delete(key)) removed += 1
      }
      return removed
    },
    ping: async () => 'PONG',
    off: () => undefined,
    once: () => undefined,
  }
}

export const asRedisClient = (fake: FakeRedis): RedisClient => fake as unknown as RedisClient