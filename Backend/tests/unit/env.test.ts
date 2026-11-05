import { describe, expect, it } from 'vitest'
import { loadEnv } from '../../src/config/env.js'

const validEnv: NodeJS.ProcessEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://postgres@localhost:5433/pos_test?schema=public',
  JWT_SECRET: 'a'.repeat(32),
}

describe('loadEnv', () => {
  it('menerima env valid dan memakai default', () => {
    const env = loadEnv(validEnv)

    expect(env.PORT).toBe(3000)
    expect(env.BCRYPT_SALT_ROUNDS).toBe(12)
    expect(env.CORS_ORIGIN).toBe('http://localhost:5173')
    expect(env.TAX_RATE).toBe(0)
  })

  it('menolak JWT_SECRET yang terlalu pendek', () => {
    expect(() => loadEnv({ ...validEnv, JWT_SECRET: 'pendek' })).toThrow(/JWT_SECRET/)
  })

  it('menolak DATABASE_URL kosong', () => {
    expect(() => loadEnv({ ...validEnv, DATABASE_URL: '' })).toThrow(/DATABASE_URL/)
  })

  it('menolak TAX_RATE di luar 0..1', () => {
    expect(() => loadEnv({ ...validEnv, TAX_RATE: '2' })).toThrow(/TAX_RATE/)
  })
})
