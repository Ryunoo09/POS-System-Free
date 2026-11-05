import type { FieldError } from '../types/http.js'

export interface AppErrorOptions {
  statusCode?: number
  code?: string
  errors?: FieldError[]
  cause?: unknown
}

export class AppError extends Error {
  readonly statusCode: number
  readonly code: string | undefined
  readonly errors: FieldError[]
  readonly isOperational = true

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = new.target.name
    this.statusCode = options.statusCode ?? 500
    this.code = options.code
    this.errors = options.errors ?? []
    Error.captureStackTrace?.(this, new.target)
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation error', errors: FieldError[] = []) {
    super(message, { statusCode: 400, code: 'VALIDATION_ERROR', errors })
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Tidak terautentikasi', code = 'UNAUTHORIZED') {
    super(message, { statusCode: 401, code })
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Anda tidak memiliki akses', code = 'PERMISSION_DENIED') {
    super(message, { statusCode: 403, code })
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource tidak ditemukan', code = 'NOT_FOUND') {
    super(message, { statusCode: 404, code })
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Terjadi konflik data', code = 'CONFLICT', errors: FieldError[] = []) {
    super(message, { statusCode: 409, code, errors })
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string, code = 'BUSINESS_RULE_VIOLATION', errors: FieldError[] = []) {
    super(message, { statusCode: 422, code, errors })
  }
}
