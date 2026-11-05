export interface PaginationMeta {
  page: number
  limit: number
  total_items: number
  total_pages: number
}

export interface ApiFieldError {
  field: string
  message: string
}

export interface ApiEnvelope<T> {
  success: true
  message: string
  data: T
  meta?: PaginationMeta
}

export interface ApiErrorPayload {
  success?: false
  code?: string
  message?: string
  errors?: ApiFieldError[]
}

export type DecimalString = string
