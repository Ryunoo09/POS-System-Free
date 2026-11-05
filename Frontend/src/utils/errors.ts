import { ApiError } from './api-error'

export const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof ApiError ? error.message : fallback

export const errorFieldErrors = (error: unknown): Record<string, string> => {
  if (!(error instanceof ApiError)) return {}

  return Object.fromEntries(error.errors.map((item) => [item.field, item.message]))
}