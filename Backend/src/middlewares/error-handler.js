import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import { AppError } from '../errors/app-errors.js'
import { logger } from '../utils/logger.js'
import { sendError } from '../utils/response.js'
import { formatZodPath } from '../utils/zod-path.js'

const zodErrors = (error) =>
  error.issues.map((issue) => ({
    field: formatZodPath(issue.path) || 'body',
    message: issue.message,
  }))

const prismaError = (error) => {
  if (error.code === 'P2002') {
    const target = Array.isArray(error.meta?.target) ? error.meta.target : [error.meta?.target]
    const field = target.filter(Boolean).join(', ')

    return {
      statusCode: 409,
      code: 'DUPLICATE_VALUE',
      message: 'Data sudah digunakan',
      errors: field ? [{ field, message: 'Nilai sudah digunakan' }] : [],
    }
  }

  if (error.code === 'P2025') {
    return {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Resource tidak ditemukan',
    }
  }

  if (error.code === 'P2003') {
    return {
      statusCode: 409,
      code: 'FOREIGN_KEY_CONSTRAINT',
      message: 'Data masih digunakan oleh data lain',
    }
  }

  return null
}

export const errorHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return sendError(res, {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Validation error',
      errors: zodErrors(error),
    })
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = prismaError(error)

    if (mapped) {
      return sendError(res, mapped)
    }
  }

  if (error instanceof AppError) {
    return sendError(res, {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      errors: error.errors,
    })
  }

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return sendError(res, {
      statusCode: 400,
      code: 'INVALID_JSON',
      message: 'Body request bukan JSON yang valid',
    })
  }

  logger.error('Unhandled error', error)

  return sendError(res, {
    statusCode: 500,
    message: 'Terjadi kesalahan pada server',
  })
}
