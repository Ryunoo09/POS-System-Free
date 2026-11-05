import type { ApiFieldError } from '@/types/api'

export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly errors: ApiFieldError[]

  constructor(message: string, status = 0, code?: string, errors: ApiFieldError[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.errors = errors
  }
}
