import type { User } from '@prisma/client'
import bcrypt from 'bcrypt'
import express from 'express'
import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const PASSWORD = 'Kasir@12345'

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  queryRaw: vi.fn(),
}))

vi.mock('../../src/config/database.js', () => ({
  prisma: {
    user: {
      findUnique: mocks.findUnique,
      findFirst: mocks.findFirst,
      update: mocks.update,
    },
    $queryRaw: mocks.queryRaw,
  },
  runInTransaction: vi.fn(),
}))

const { prisma } = await import('../../src/config/database.js')
const { createApp } = await import('../../src/app.js')
const { createUserRepository } = await import('../../src/repositories/user.repository.js')
const { authenticate } = await import('../../src/middlewares/authenticate.js')
const { authorize } = await import('../../src/middlewares/authorize.js')
const { errorHandler } = await import('../../src/middlewares/error-handler.js')
const { notFound } = await import('../../src/middlewares/not-found.js')
const { PERMISSIONS } = await import('../../src/constants/permissions.js')

let users: User[] = []

const app = createApp()

const userRepository = createUserRepository(prisma)

const probe = express()
probe.use(express.json())
probe.post(
  '/products',
  authenticate({ userRepository }),
  authorize(PERMISSIONS.PRODUCT_WRITE),
  (_req, res) => {
    res.json({ success: true })
  },
)
probe.get(
  '/reports/sales',
  authenticate({ userRepository }),
  authorize(PERMISSIONS.REPORT_READ),
  (_req, res) => {
    res.json({ success: true })
  },
)
probe.use(notFound)
probe.use(errorHandler)

const buildUsers = async (): Promise<User[]> => {
  const passwordHash = await bcrypt.hash(PASSWORD, 4)
  const base = {
    passwordHash,
    isActive: true,
    tokenVersion: 0,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  }

  return [
    { id: 'admin-1', name: 'Andi Pratama', email: 'admin@pos.local', role: 'ADMIN', ...base },
    { id: 'owner-1', name: 'Rina Kusuma', email: 'owner@pos.local', role: 'OWNER', ...base },
    { id: 'cashier-1', name: 'Siti Rahma', email: 'kasir1@pos.local', role: 'CASHIER', ...base },
  ]
}

beforeAll(async () => {
  users = await buildUsers()

  mocks.findUnique.mockImplementation(({ where }: { where: { email?: string } }) =>
    Promise.resolve(users.find((user) => user.email === where.email) ?? null),
  )

  mocks.findFirst.mockImplementation(({ where }: { where: { id?: string; isActive?: boolean } }) =>
    Promise.resolve(
      users.find(
        (user) =>
          user.id === where.id && (where.isActive === undefined || user.isActive === where.isActive),
      ) ?? null,
    ),
  )

  mocks.update.mockImplementation(
    ({ where, data }: { where: { id: string }; data: { tokenVersion?: { increment: number } } }) => {
      const target = users.find((user) => user.id === where.id)

      if (!target) {
        return Promise.reject(new Error('user tidak ditemukan'))
      }

      if (data.tokenVersion?.increment) {
        target.tokenVersion += data.tokenVersion.increment
      }

      return Promise.resolve(target)
    },
  )
})

beforeEach(() => {
  vi.clearAllMocks()

  for (const user of users) {
    user.isActive = true
    user.tokenVersion = 0
  }
})

const login = async (email: string, password = PASSWORD): Promise<string> => {
  const response = await request(app).post('/api/auth/login').send({ email, password })

  return (response.body as { data: { token: string } }).data.token
}

describe('POST /api/auth/login', () => {
  it('login Cashier berhasil dengan token dan permission', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'kasir1@pos.local', password: PASSWORD })

    expect(response.status).toBe(200)
    expect(response.body.data.token).toEqual(expect.any(String))
    expect(response.body.data.token_type).toBe('Bearer')
    expect(response.body.data.user).toMatchObject({ email: 'kasir1@pos.local', role: 'CASHIER' })
    expect(response.body.data.user.permissions).toEqual(
      expect.arrayContaining(['product:read', 'transaction:create']),
    )
    expect(JSON.stringify(response.body)).not.toContain('passwordHash')
  })

  it('menormalkan email menjadi lowercase dan trim', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: '  KASIR1@POS.LOCAL  ', password: PASSWORD })

    expect(response.status).toBe(200)
  })

  it('password salah dan email tidak ada menghasilkan 401 yang identik', async () => {
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'kasir1@pos.local', password: 'salah' })
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tidak-ada@pos.local', password: PASSWORD })

    expect(wrongPassword.status).toBe(401)
    expect(unknownEmail.status).toBe(401)
    expect(wrongPassword.body).toMatchObject({ success: false, code: 'INVALID_CREDENTIALS' })
    expect(unknownEmail.body).toMatchObject({ success: false, code: 'INVALID_CREDENTIALS' })
    expect(wrongPassword.body.message).toBe(unknownEmail.body.message)
  })

  it('body tidak valid menghasilkan 400', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bukan-email', password: '' })

    expect(response.status).toBe(400)
    expect(response.body.code).toBe('VALIDATION_ERROR')
  })
})

describe('GET /api/auth/me', () => {
  it('mengembalikan user untuk token valid', async () => {
    const token = await login('kasir1@pos.local')

    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ id: 'cashier-1', role: 'CASHIER' })
    expect(response.body.data.permissions).toContain('transaction:create')
  })

  it('401 saat tanpa token', async () => {
    const response = await request(app).get('/api/auth/me')

    expect(response.status).toBe(401)
    expect(response.body.code).toBe('TOKEN_INVALID')
  })

  it('401 saat token rusak', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-valid-token')

    expect(response.status).toBe(401)
    expect(response.body.code).toBe('TOKEN_INVALID')
  })

  it('401 saat user dinonaktifkan setelah token terbit', async () => {
    const token = await login('kasir1@pos.local')
    const target = users.find((user) => user.id === 'cashier-1')

    if (target) {
      target.isActive = false
    }

    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(401)
    expect(response.body.code).toBe('TOKEN_INVALID')
  })
})

describe('POST /api/auth/logout', () => {
  it('berhasil dengan token valid', async () => {
    const token = await login('kasir1@pos.local')

    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ success: true, data: null })
  })

  it('mencabut token lama setelah logout', async () => {
    const token = await login('kasir1@pos.local')

    const logout = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)

    expect(logout.status).toBe(200)

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)

    expect(me.status).toBe(401)
    expect(me.body.code).toBe('TOKEN_INVALID')
  })

  it('401 tanpa token', async () => {
    const response = await request(app).post('/api/auth/logout')

    expect(response.status).toBe(401)
    expect(response.body.code).toBe('TOKEN_INVALID')
  })
})

describe('matriks RBAC authorize', () => {
  it('hanya Admin boleh menulis produk', async () => {
    const adminToken = await login('admin@pos.local')
    const ownerToken = await login('owner@pos.local')
    const cashierToken = await login('kasir1@pos.local')

    const admin = await request(probe).post('/products').set('Authorization', `Bearer ${adminToken}`)
    const owner = await request(probe).post('/products').set('Authorization', `Bearer ${ownerToken}`)
    const cashier = await request(probe)
      .post('/products')
      .set('Authorization', `Bearer ${cashierToken}`)

    expect(admin.status).toBe(200)
    expect(owner.status).toBe(403)
    expect(cashier.status).toBe(403)
    expect(owner.body.code).toBe('PERMISSION_DENIED')
    expect(cashier.body.code).toBe('PERMISSION_DENIED')
  })

  it('Cashier ditolak 403 pada laporan, tanpa token 401', async () => {
    const cashierToken = await login('kasir1@pos.local')

    const cashier = await request(probe)
      .get('/reports/sales')
      .set('Authorization', `Bearer ${cashierToken}`)
    const anonymous = await request(probe).get('/reports/sales')

    expect(cashier.status).toBe(403)
    expect(cashier.body.code).toBe('PERMISSION_DENIED')
    expect(anonymous.status).toBe(401)
    expect(anonymous.body.code).toBe('TOKEN_INVALID')
  })
})
