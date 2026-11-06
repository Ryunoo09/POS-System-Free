import type { RequestHandler } from 'express'
import type { Permission } from '../constants/permissions.js'
import { ForbiddenError, UnauthorizedError } from '../errors/app-errors.js'

/**
 * Membatasi route pada satu permission, atau salah satu dari beberapa permission
 * (semantik any-of) bila diberikan array.
 */
export const authorize = (permission: Permission | readonly Permission[]): RequestHandler => {
  const required: readonly Permission[] =
    typeof permission === 'string' ? [permission] : permission

  return (req, _res, next) => {
    const user = req.user

    if (!user) {
      return next(new UnauthorizedError('Sesi tidak valid', 'TOKEN_INVALID'))
    }

    if (!required.some((item) => user.permissions.includes(item))) {
      return next(new ForbiddenError('Anda tidak memiliki akses', 'PERMISSION_DENIED'))
    }

    return next()
  }
}