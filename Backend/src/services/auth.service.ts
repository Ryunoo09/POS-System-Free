import bcrypt from 'bcrypt'
import { env } from '../config/env.js'
import { UnauthorizedError } from '../errors/app-errors.js'
import { toAuthUser } from '../mappers/user.mapper.js'
import type { UserRepository } from '../repositories/user.repository.js'
import type { AuthUser } from '../types/auth.js'
import { signAccessToken } from '../utils/jwt.js'

export interface AuthSession {
  token: string
  token_type: 'Bearer'
  expires_in: string
  user: AuthUser
}

export interface AuthService {
  login: (email: string, password: string) => Promise<AuthSession>
  me: (userId: string) => Promise<AuthUser>
}

export const createAuthService = ({
  userRepository,
}: {
  userRepository: UserRepository
}): AuthService => {
  const invalidCredentials = (): UnauthorizedError =>
    new UnauthorizedError('Email atau password salah', 'INVALID_CREDENTIALS')

  return {
    login: async (email, password) => {
      const user = await userRepository.findByEmail(email.trim().toLowerCase())

      if (!user || !user.isActive) {
        throw invalidCredentials()
      }

      const passwordMatches = await bcrypt.compare(password, user.passwordHash)

      if (!passwordMatches) {
        throw invalidCredentials()
      }

      return {
        token: signAccessToken({ sub: user.id, role: user.role }),
        token_type: 'Bearer',
        expires_in: env.JWT_EXPIRES_IN,
        user: toAuthUser(user),
      }
    },

    me: async (userId) => {
      const user = await userRepository.findActiveById(userId)

      if (!user) {
        throw new UnauthorizedError('Sesi tidak valid', 'TOKEN_INVALID')
      }

      return toAuthUser(user)
    },
  }
}
