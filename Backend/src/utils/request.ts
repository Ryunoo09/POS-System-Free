import type { Request } from 'express'
import { UnauthorizedError } from '../errors/app-errors.js'
import type { AuthUser } from '../types/auth.js'

/**
 * Mengambil aktor terautentikasi. Hanya dipanggil pada route yang telah melewati
 * middleware `authenticate`, sehingga `req.user` seharusnya selalu ada.
 */
export const requireActor = (req: Request): AuthUser => {
  if (!req.user) {
    throw new UnauthorizedError('Sesi tidak valid', 'TOKEN_INVALID')
  }

  return req.user
}
