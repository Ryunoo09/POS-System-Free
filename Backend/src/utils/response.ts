import type { Response } from 'express'
import type { ApiEnvelope, ApiErrorEnvelope, FieldError, PaginationMeta } from '../types/http.js'

export interface SuccessOptions<T> {
  statusCode?: number | undefined
  message?: string | undefined
  data?: T | undefined
  meta?: PaginationMeta | undefined
}

export interface ErrorOptions {
  statusCode?: number | undefined
  message?: string | undefined
  code?: string | undefined
  errors?: FieldError[] | undefined
}

export const sendSuccess = <T>(res: Response, options: SuccessOptions<T> = {}): Response => {
  const payload: ApiEnvelope<T | null> = {
    success: true,
    message: options.message ?? 'Request successful',
    data: options.data ?? null,
  }

  if (options.meta !== undefined) {
    payload.meta = options.meta
  }

  return res.status(options.statusCode ?? 200).json(payload)
}

export const sendError = (res: Response, options: ErrorOptions = {}): Response => {
  const payload: ApiErrorEnvelope = {
    success: false,
    message: options.message ?? 'Terjadi kesalahan pada server',
    errors: options.errors ?? [],
  }

  if (options.code !== undefined) {
    payload.code = options.code
  }

  return res.status(options.statusCode ?? 500).json(payload)
}
