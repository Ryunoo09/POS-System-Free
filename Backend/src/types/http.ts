export interface FieldError {
  field: string
  message: string
}

export interface PaginationMeta {
  page: number
  limit: number
  total_items: number
  total_pages: number
}

export interface ApiEnvelope<T> {
  success: true
  message: string
  data: T
  meta?: PaginationMeta
}

export interface ApiErrorEnvelope {
  success: false
  code?: string
  message: string
  errors: FieldError[]
}
