import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/config/database.js', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
  runInTransaction: vi.fn(),
}))

const { prisma } = await import('../../src/config/database.js')
const { createApp } = await import('../../src/app.js')

const app = createApp()

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mengembalikan 200 saat database tersedia', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }])

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
    prisma.$queryRaw.mockRejectedValue(new Error('connection refused'))

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
