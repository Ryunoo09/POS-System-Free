import type { RequestHandler } from 'express'
import { TooManyRequestsError } from '../errors/app-errors.js'

export interface LoginRateLimiterOptions {
  windowMs?: number
  maxAttempts?: number
  now?: () => number
}

const DEFAULT_WINDOW_MS = 15 * 60 * 1000
const DEFAULT_MAX_ATTEMPTS = 20

interface AttemptBucket {
  count: number
  resetAt: number
}

/**
 * Single-instance in-memory limiter untuk percobaan login.
 * Gunakan Redis bila backend dijalankan lebih dari satu instance.
 */
export const createLoginRateLimiter = ({
  windowMs = DEFAULT_WINDOW_MS,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  now = Date.now,
}: LoginRateLimiterOptions = {}): RequestHandler => {
  const attempts = new Map<string, AttemptBucket>()

  return (req, res, next) => {
    const nowMs = now()

    for (const [key, bucket] of attempts) {
      if (bucket.resetAt <= nowMs) attempts.delete(key)
    }

    const email =
      typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const key = `${req.ip ?? 'unknown'}:${email}`
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
