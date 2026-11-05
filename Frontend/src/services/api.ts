import axios, { type AxiosRequestConfig } from 'axios'
import type { ApiEnvelope, ApiErrorPayload } from '@/types/api'
import { ApiError } from '@/utils/api-error'
import { TOKEN_STORAGE_KEY } from '@/utils/constants'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const api = axios.create({
  baseURL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError<ApiErrorPayload>(error)) {
      throw new ApiError('Tidak dapat terhubung ke server')
    }

    const isLoginRequest = error.config?.url?.includes('/auth/login')
    const status = error.response?.status ?? 0

    if (status === 401 && !isLoginRequest) {
      localStorage.removeItem(TOKEN_STORAGE_KEY)

      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }

    const payload = error.response?.data
    const message =
      payload?.message ??
      (error.code === 'ECONNABORTED'
        ? 'Request melewati batas waktu'
        : 'Tidak dapat terhubung ke server')

    throw new ApiError(message, status, payload?.code, payload?.errors ?? [])
  },
)

export const http = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    api.get<ApiEnvelope<T>>(url, config).then((response) => response.data),

  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    api.post<ApiEnvelope<T>>(url, body, config).then((response) => response.data),

  put: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    api.put<ApiEnvelope<T>>(url, body, config).then((response) => response.data),

  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    api.delete<ApiEnvelope<T>>(url, config).then((response) => response.data),
}
