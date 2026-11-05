import type { RequestHandler } from 'express'
import type { Permission } from '../constants/permissions.js'
import { ForbiddenError, UnauthorizedError } from '../errors/app-errors.js'

export const authorize = (permission: Permission): RequestHandler => {
  return (req, _res, next) => {
    const user = req.user

    if (!user) {
      return next(new UnauthorizedError('Sesi tidak valid', 'TOKEN_INVALID'))
    }

    if (!user.permissions.includes(permission)) {
      return next(new ForbiddenError('Anda tidak memiliki akses', 'PERMISSION_DENIED'))
    }

    return next()
  }
}
