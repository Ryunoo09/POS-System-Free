import bcrypt from 'bcrypt'
import { env } from '../config/env.js'
import { BusinessRuleError, ConflictError, NotFoundError, ValidationError } from '../errors/app-errors.js'
import { toUserDto, type UserDto } from '../mappers/user.mapper.js'
import type { UserRepository } from '../repositories/user.repository.js'
import type { AuditRecorder } from './audit.service.js'
import type { PaginationMeta } from '../types/http.js'
import { buildFieldDiff } from '../utils/audit-diff.js'
import { buildPaginationMeta, toSkip } from '../utils/pagination.js'
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from '../validators/user.validator.js'

export interface UserActor {
  id: string
  ipAddress?: string | null
  userAgent?: string | null
}

export interface UserService {
  list: (query: ListUsersQuery) => Promise<{ items: UserDto[]; meta: PaginationMeta }>
  create: (input: CreateUserInput) => Promise<UserDto>
  update: (id: string, input: UpdateUserInput, actor: UserActor) => Promise<UserDto>
}

export const createUserService = ({
  userRepository,
  audit,
}: {
  userRepository: UserRepository
  audit?: AuditRecorder
}): UserService => {
  const hashPassword = (password: string): Promise<string> =>
    bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS)

  const findOrFail = async (id: string) => {
    const user = await userRepository.findById(id)

    if (!user) {
      throw new NotFoundError('Pengguna tidak ditemukan', 'NOT_FOUND')
    }

    return user
  }

  return {
    list: async (query) => {
      const { items, total } = await userRepository.list({
        skip: toSkip(query.page, query.limit),
        take: query.limit,
        search: query.search,
        role: query.role,
        isActive: query.is_active,
      })

      return {
        items: items.map(toUserDto),
        meta: buildPaginationMeta(query.page, query.limit, total),
      }
    },

    create: async (input) => {
      const existing = await userRepository.findByEmail(input.email)

      if (existing) {
        throw new ConflictError('Email sudah digunakan', 'DUPLICATE_EMAIL', [
          { field: 'email', message: 'Email sudah digunakan' },
        ])
      }

      const created = await userRepository.create({
        name: input.name,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        role: input.role,
      })

      return toUserDto(created)
    },

    update: async (id, input, actor) => {
      const target = await findOrFail(id)

      if (input.password !== undefined && input.password === target.email) {
        throw new ValidationError('Password tidak boleh sama dengan email', [
          { field: 'password', message: 'Password tidak boleh sama dengan email' },
        ])
      }

      if (input.is_active === false && target.id === actor.id) {
        throw new BusinessRuleError(
          'Admin tidak dapat menonaktifkan akun sendiri',
          'LAST_ADMIN_PROTECTED',
        )
      }

      const demotingAdmin =
        target.role === 'ADMIN' &&
        target.isActive &&
        input.role !== undefined &&
        input.role !== 'ADMIN'
      const deactivatingAdmin =
        target.role === 'ADMIN' && target.isActive && input.is_active === false

      if (demotingAdmin || deactivatingAdmin) {
        const activeAdmins = await userRepository.countActiveAdmins()

        if (activeAdmins <= 1) {
          throw new BusinessRuleError(
            'Admin aktif terakhir tidak dapat dinonaktifkan atau diturunkan role-nya',
            'LAST_ADMIN_PROTECTED',
          )
        }
      }

      const updated = await userRepository.update(id, {
        name: input.name,
        role: input.role,
        isActive: input.is_active,
        passwordHash: input.password === undefined ? undefined : await hashPassword(input.password),
      })

      const diff = buildFieldDiff(
        { name: target.name, role: target.role, is_active: target.isActive, password: false },
        {
          name: updated.name,
          role: updated.role,
          is_active: updated.isActive,
          password: input.password !== undefined,
        },
      )

      if (diff) {
        await audit?.record({
          userId: actor.id,
          action: 'UPDATE',
          entity: 'USER',
          entityId: id,
          oldValue: diff.oldValue,
          newValue: diff.newValue,
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        })
      }

      return toUserDto(updated)
    },
  }
}
