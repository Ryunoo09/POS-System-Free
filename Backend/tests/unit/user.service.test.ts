import type { User } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import type { UserRepository } from '../../src/repositories/user.repository.js'
import { createUserService } from '../../src/services/user.service.js'
import type { UpdateUserInput } from '../../src/validators/user.validator.js'

const actor = { id: 'admin-1' }

const buildUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  name: 'Siti Rahma',
  email: 'kasir1@pos.local',
  passwordHash: '$2b$04$hash-lama',
  role: 'CASHIER',
  isActive: true,
  tokenVersion: 0,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
})

const buildDependencies = (options: { target?: User } = {}) => {
  const update = vi.fn(async (_id: string, data: Partial<User>) => buildUser(data))

  const userRepository = {
    findByEmail: async () => null,
    findById: async () => options.target ?? buildUser(),
    findActiveById: async () => options.target ?? buildUser(),
    list: async () => ({ items: [], total: 0 }),
    countActiveAdmins: async () => 2,
    create: async () => buildUser(),
    update,
    incrementTokenVersion: async () => undefined,
  } as unknown as UserRepository

  const record = vi.fn(async () => undefined)
  const service = createUserService({ userRepository, audit: { record } })

  return { service, update, record }
}

describe('UserService.update', () => {
  it('menaikkan token version saat password diubah', async () => {
    const deps = buildDependencies()

    await deps.service.update('user-1', { password: 'PasswordBaru123' }, actor)

    expect(deps.update).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ incrementTokenVersion: true }),
    )
  })

  it('tidak menaikkan token version saat hanya nama berubah', async () => {
    const deps = buildDependencies()

    await deps.service.update('user-1', { name: 'Siti Baru' } as UpdateUserInput, actor)

    expect(deps.update).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ incrementTokenVersion: false }),
    )
  })
})
