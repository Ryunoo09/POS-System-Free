import { createHash } from 'node:crypto'
import type { RequestHandler } from 'express'
import { cacheKeys } from '../cache/cache-keys.js'
import { noopCache, type CacheService } from '../cache/cache.service.js'
import { TooManyRequestsError } from '../errors/app-errors.js'

export interface LoginRateLimiterOptions {
  windowMs?: number
  maxAttempts?: number
  now?: () => number
  cache?: CacheService
}

const DEFAULT_WINDOW_MS = 15 * 60 * 1000
const DEFAULT_MAX_ATTEMPTS = 20

interface AttemptBucket {
  count: number
  resetAt: number
}

/** Hash email agar PII tidak muncul di key Redis. */
const emailHash = (email: string): string =>
  createHash('sha1').update(email).digest('hex').slice(0, 16)

/**
 * Limiter percobaan login.
 *
 * Memakai Redis bila cache siap (aman untuk backend multi-instance), dan jatuh
 * ke in-memory saat cache mati/tidak siap sehingga proteksi tidak hilang.
 * `maxAttempts = 0` mematikan limiter (dipakai saat E2E lokal).
 */
export const createLoginRateLimiter = ({
  windowMs = DEFAULT_WINDOW_MS,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  now = Date.now,
  cache = noopCache,
}: LoginRateLimiterOptions = {}): RequestHandler => {
  const attempts = new Map<string, AttemptBucket>()

  if (maxAttempts <= 0) {
    return (_req, _res, next) => next()
  }

  return async (req, res, next) => {
    const nowMs = now()
    const email =
      typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const ip = req.ip ?? 'unknown'

    if (cache.enabled) {
      const seconds = Math.ceil(windowMs / 1000)
      const count = await cache.incrWithTtl(cacheKeys.loginRateLimit(ip, emailHash(email)), seconds)

      if (count !== null) {
        if (count > maxAttempts) {
          res.setHeader('Retry-After', String(seconds))
          return next(new TooManyRequestsError())
        }

        return next()
      }
    }

    // Fallback in-memory: single instance atau Redis tidak siap.
    for (const [key, bucket] of attempts) {
      if (bucket.resetAt <= nowMs) attempts.delete(key)
    }

    const key = `${ip}:${email}`
    const current = attempts.get(key)

    if (!current || current.resetAt <= nowMs) {
      attempts.set(key, { count: 1, resetAt: nowMs + windowMs })
      return next()
    }

    if (current.count >= maxAttempts) {
      res.setHeader('Retry-After', String(Math.ceil((current.resetAt - nowMs) / 1000)))
      return next(new TooManyRequestsError())
    }

    current.count += 1
    return next()
  }
}
