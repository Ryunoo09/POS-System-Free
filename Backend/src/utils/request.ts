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

/** Metadata request untuk kolom audit `ip_address` dan `user_agent`. */
export const auditContextFrom = (
  req: Request,
): { ipAddress: string | null; userAgent: string | null } => ({
  ipAddress: req.ip ?? null,
  userAgent: req.get('user-agent')?.slice(0, 255) ?? null,
})
