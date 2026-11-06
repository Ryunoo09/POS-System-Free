import { ValidationError } from '../errors/app-errors.js'

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Header `Idempotency-Key` wajib UUID v4 (PRD §17.8). */
export const parseIdempotencyKey = (value: string | undefined): string => {
  if (!value || !UUID_V4_PATTERN.test(value)) {
    throw new ValidationError('Idempotency-Key wajib UUID v4', [
      { field: 'Idempotency-Key', message: 'Header Idempotency-Key wajib UUID v4' },
    ])
  }

  return value
}

/** Deteksi unique violation Prisma tanpa mengimpor `@prisma/client` di service layer. */
export const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: unknown }).code === 'P2002'
