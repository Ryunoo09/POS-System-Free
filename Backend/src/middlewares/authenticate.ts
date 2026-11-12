import type { RequestHandler } from 'express'
import { UnauthorizedError } from '../errors/app-errors.js'
import { toAuthUser } from '../mappers/user.mapper.js'
import type { UserRepository } from '../repositories/user.repository.js'
import { verifyAccessToken } from '../utils/jwt.js'

const TOKEN_INVALID_MESSAGE = 'Sesi tidak valid'

export const authenticate = ({
  userRepository,
}: {
  userRepository: UserRepository
}): RequestHandler => {
  return async (req, _res, next) => {
    const header = req.headers.authorization
    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : ''

    if (!token) {
      return next(new UnauthorizedError(TOKEN_INVALID_MESSAGE, 'TOKEN_INVALID'))
    }

    const payload = verifyAccessToken(token)

    if (!payload) {
      return next(new UnauthorizedError(TOKEN_INVALID_MESSAGE, 'TOKEN_INVALID'))
    }

    const user = await userRepository.findActiveById(payload.sub)

    if (!user) {
      return next(new UnauthorizedError(TOKEN_INVALID_MESSAGE, 'TOKEN_INVALID'))
    }

    if (payload.tv !== user.tokenVersion) {
      return next(new UnauthorizedError(TOKEN_INVALID_MESSAGE, 'TOKEN_INVALID'))
    }

    req.user = toAuthUser(user)

    return next()
  }
}
