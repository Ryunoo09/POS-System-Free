import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn<() => Promise<unknown>>(),
  runInTransaction: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
}))

vi.mock('../../src/config/database.js', () => ({
  prisma: {
    $queryRaw: mocks.queryRaw,
  },
  runInTransaction: mocks.runInTransaction,
}))

const { createApp } = await import('../../src/app.js')

const app = createApp()

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mengembalikan 200 saat database tersedia', async () => {
    mocks.queryRaw.mockResolvedValue([{ '?column?': 1 }])

    const response = await request(app).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      success: true,
      data: {
        status: 'ok',
        database: 'ok',
      },
    })
    expect(response.body.data.timestamp).toEqual(expect.any(String))
  })

  it('mengembalikan 503 saat database tidak tersedia', async () => {
    mocks.queryRaw.mockRejectedValue(new Error('connection refused'))

    const response = await request(app).get('/api/health')

    expect(response.status).toBe(503)
    expect(response.body).toMatchObject({
      success: false,
      code: 'DATABASE_UNAVAILABLE',
      errors: [],
    })
  })
})

describe('route tidak dikenal', () => {
  it('mengembalikan 404 dengan format standar', async () => {
    const response = await request(app).get('/api/tidak-ada')

    expect(response.status).toBe(404)
    expect(response.body).toMatchObject({
      success: false,
      code: 'ROUTE_NOT_FOUND',
      errors: [],
    })
  })
})
