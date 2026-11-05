import type { RequestHandler } from 'express'
import { UnauthorizedError } from '../errors/app-errors.js'
import type { AuthService } from '../services/auth.service.js'
import type { AuthUser } from '../types/auth.js'
import { sendSuccess } from '../utils/response.js'
import type { LoginInput } from '../validators/auth.validator.js'

export interface AuthController {
  login: RequestHandler
  me: RequestHandler
  logout: RequestHandler
}

export const createAuthController = ({
  authService,
}: {
  authService: AuthService
}): AuthController => ({
  login: async (req, res) => {
    const { email, password } = req.validated?.body as LoginInput
    const data = await authService.login(email, password)

    return sendSuccess(res, { message: 'Login berhasil', data })
  },

  me: async (req, res) => {
    const userId = req.user?.id

    if (!userId) {
      throw new UnauthorizedError('Sesi tidak valid', 'TOKEN_INVALID')
    }

    const user: AuthUser = await authService.me(userId)

    return sendSuccess(res, { message: 'Request successful', data: user })
  },

  logout: (_req, res) => sendSuccess(res, { message: 'Logout berhasil', data: null }),
})
