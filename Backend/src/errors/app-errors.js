export class AppError extends Error {
  constructor(message, { statusCode = 500, code, errors = [], cause } = {}) {
    super(message, { cause })
    this.name = new.target.name
    this.statusCode = statusCode
    this.code = code
    this.errors = errors
    this.isOperational = true
    Error.captureStackTrace?.(this, new.target)
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation error', errors = []) {
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
  constructor(message = 'Terjadi konflik data', code = 'CONFLICT', errors = []) {
    super(message, { statusCode: 409, code, errors })
  }
}

export class BusinessRuleError extends AppError {
  constructor(message, code = 'BUSINESS_RULE_VIOLATION', errors = []) {
    super(message, { statusCode: 422, code, errors })
  }
}
