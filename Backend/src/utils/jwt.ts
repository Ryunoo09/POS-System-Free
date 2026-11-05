import jwt from 'jsonwebtoken'
import type { SignOptions } from 'jsonwebtoken'
import { env } from '../config/env.js'
import { isRole, type Role } from '../constants/roles.js'

export interface AccessTokenPayload {
  sub: string
  role: Role
}

export const signAccessToken = ({ sub, role }: AccessTokenPayload): string =>
  jwt.sign({ role }, env.JWT_SECRET, {
    subject: sub,
    expiresIn: env.JWT_EXPIRES_IN as NonNullable<SignOptions['expiresIn']>,
    algorithm: 'HS256',
  })

export const verifyAccessToken = (token: string): AccessTokenPayload | null => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] })

    if (typeof decoded !== 'object' || decoded === null) {
      return null
    }

    const { sub, role } = decoded as { sub?: unknown; role?: unknown }

    if (typeof sub !== 'string' || !isRole(role)) {
      return null
    }

    return { sub, role }
  } catch {
    return null
  }
}
