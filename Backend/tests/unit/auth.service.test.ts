import bcrypt from 'bcrypt'
import type { User } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import type { UserRepository } from '../../src/repositories/user.repository.js'
import { createAuthService } from '../../src/services/auth.service.js'
import { verifyAccessToken } from '../../src/utils/jwt.js'

const PASSWORD = 'Kasir@12345'

const buildUser = async (overrides: Partial<User> = {}): Promise<User> => ({
  id: 'user-1',
  name: 'Siti Rahma',
  email: 'kasir1@pos.local',
  passwordHash: await bcrypt.hash(PASSWORD, 4),
  role: 'CASHIER',
  isActive: true,
  tokenVersion: 0,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
})

const buildRepository = (user: User | null): UserRepository => ({
  findByEmail: async () => user,
  findActiveById: async () => user,
  findById: async () => user,
  list: async () => ({ items: user ? [user] : [], total: user ? 1 : 0 }),
  countActiveAdmins: async () => 0,
  create: async () => {
    throw new Error('tidak dipakai pada test ini')
  },
  update: async () => {
    throw new Error('tidak dipakai pada test ini')
  },
  incrementTokenVersion: async () => undefined,
})

describe('AuthService.login', () => {
  it('mengembalikan token dan user tanpa password_hash saat kredensial benar', async () => {
    const user = await buildUser()
    const service = createAuthService({ userRepository: buildRepository(user) })

    const session = await service.login('KASIR1@pos.local', PASSWORD)

    expect(session.token).toEqual(expect.any(String))
    expect(session.token_type).toBe('Bearer')
    expect(session.user).toMatchObject({ id: 'user-1', role: 'CASHIER' })
    expect(session.user.permissions).toContain('transaction:create')
    expect(session.user).not.toHaveProperty('passwordHash')
    expect(JSON.stringify(session)).not.toContain(user.passwordHash)
    expect(verifyAccessToken(session.token)?.tv).toBe(0)
  })

  it('menolak email yang tidak terdaftar dengan 401 INVALID_CREDENTIALS', async () => {
    const service = createAuthService({ userRepository: buildRepository(null) })

    await expect(service.login('tidak-ada@pos.local', PASSWORD)).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    })
  })

  it('menolak password salah dengan pesan generik yang sama', async () => {
    const user = await buildUser()
    const service = createAuthService({ userRepository: buildRepository(user) })

    await expect(service.login('kasir1@pos.local', 'password-salah')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Email atau password salah',
    })
  })

  it('menolak user yang nonaktif', async () => {
    const user = await buildUser({ isActive: false })
    const service = createAuthService({ userRepository: buildRepository(user) })

    await expect(service.login('kasir1@pos.local', PASSWORD)).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    })
  })
})

describe('AuthService.me', () => {
  it('melempar TOKEN_INVALID ketika user tidak lagi aktif', async () => {
    const service = createAuthService({ userRepository: buildRepository(null) })

    await expect(service.me('user-1')).rejects.toMatchObject({
      statusCode: 401,
      code: 'TOKEN_INVALID',
    })
  })
})

describe('AuthService.logout', () => {
  it('menaikkan token version user agar token lama tidak berlaku', async () => {
    const user = await buildUser()
    const incrementTokenVersion = vi.fn(async () => undefined)
    const service = createAuthService({
      userRepository: { ...buildRepository(user), incrementTokenVersion },
    })

    await service.logout('user-1')

    expect(incrementTokenVersion).toHaveBeenCalledWith('user-1')
  })
})
