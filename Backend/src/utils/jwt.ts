import jwt from 'jsonwebtoken'
import type { SignOptions } from 'jsonwebtoken'
import { env } from '../config/env.js'
import { isRole, type Role } from '../constants/roles.js'

export interface AccessTokenPayload {
  sub: string
  role: Role
  tv: number
}

export const signAccessToken = ({
  sub,
  role,
  tokenVersion,
}: {
  sub: string
  role: Role
  tokenVersion: number
}): string =>
  jwt.sign({ role, tv: tokenVersion }, env.JWT_SECRET, {
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

    const { sub, role, tv } = decoded as { sub?: unknown; role?: unknown; tv?: unknown }

    if (typeof sub !== 'string' || !isRole(role) || typeof tv !== 'number') {
      return null
    }

    return { sub, role, tv }
  } catch {
    return null
  }
}
