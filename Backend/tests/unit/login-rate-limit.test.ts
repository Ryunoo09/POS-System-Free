import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { errorHandler } from '../../src/middlewares/error-handler.js'
import { createLoginRateLimiter } from '../../src/middlewares/login-rate-limit.js'
import { notFound } from '../../src/middlewares/not-found.js'

const buildApp = (options: { maxAttempts?: number; windowMs?: number; now?: () => number }) => {
  const app = express()
  app.use(express.json())
  app.use(createLoginRateLimiter(options))
  app.post('/login', (_req, res) => {
    res.json({ success: true })
  })
  app.use(notFound)
  app.use(errorHandler)

  return app
}

const login = (app: express.Express, email: string) =>
  request(app).post('/login').send({ email, password: 'rahasia' })

describe('createLoginRateLimiter', () => {
  it('menolak percobaan setelah batas tercapai dengan 429 dan Retry-After', async () => {
    const app = buildApp({ maxAttempts: 2 })

    const first = await login(app, 'kasir@pos.local')
    const second = await login(app, 'kasir@pos.local')
    const third = await login(app, 'kasir@pos.local')

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(third.status).toBe(429)
    expect(third.body).toMatchObject({ success: false, code: 'TOO_MANY_REQUESTS' })
    expect(Number(third.headers['retry-after'])).toBeGreaterThan(0)
  })

  it('mengizinkan lagi setelah jendela waktu lewat', async () => {
    let current = 1_000
    const app = buildApp({ maxAttempts: 2, windowMs: 60_000, now: () => current })

    await login(app, 'kasir@pos.local')
    await login(app, 'kasir@pos.local')

    const blocked = await login(app, 'kasir@pos.local')
    expect(blocked.status).toBe(429)

    current += 60_001

    const allowed = await login(app, 'kasir@pos.local')
    expect(allowed.status).toBe(200)
  })

  it('memisahkan bucket per email pada IP yang sama', async () => {
    const app = buildApp({ maxAttempts: 1 })

    const first = await login(app, 'kasir1@pos.local')
    const second = await login(app, 'kasir2@pos.local')
    const blocked = await login(app, 'kasir1@pos.local')

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(blocked.status).toBe(429)
  })

  it('menormalkan email menjadi lowercase dan trim', async () => {
    const app = buildApp({ maxAttempts: 1 })

    const first = await login(app, 'Kasir@pos.local')
    const blocked = await login(app, '  kasir@pos.local  ')

    expect(first.status).toBe(200)
    expect(blocked.status).toBe(429)
  })
})
