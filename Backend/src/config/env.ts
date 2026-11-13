import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL wajib diisi'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET minimal 32 karakter'),
  JWT_EXPIRES_IN: z.string().min(1).default('8h'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  TAX_RATE: z.coerce.number().min(0).max(1).default(0),
  // 0 berarti limiter login dimatikan (mis. saat menjalankan E2E lokal).
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(0).default(20),
  LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  // Cache Redis bersifat opsional: bila Redis mati, aplikasi tetap jalan lewat PostgreSQL.
  REDIS_ENABLED: z.enum(['true', 'false']).default('true').transform((value) => value === 'true'),
  // Pakai 127.0.0.1, bukan localhost: di Windows `localhost` bisa resolve ke IPv6 (::1) saat Redis hanya bind IPv4.
  REDIS_URL: z.string().url().default('redis://127.0.0.1:6379'),
  REDIS_KEY_PREFIX: z.string().min(1).default('pos:v1'),
})

export type Env = z.infer<typeof envSchema>

export const loadEnv = (source: NodeJS.ProcessEnv = process.env): Env => {
  const result = envSchema.safeParse(source)

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `- ${issue.path.map(String).join('.') || 'env'}: ${issue.message}`)
      .join('\n')

    throw new Error(`Environment tidak valid:\n${details}`)
  }

  return result.data
}

export const env = loadEnv()
