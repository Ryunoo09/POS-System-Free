import { http } from './api'
import type { AuthSession, AuthUser, LoginPayload } from '@/types/auth'

export const authService = {
  async login(payload: LoginPayload): Promise<AuthSession> {
    const response = await http.post<AuthSession>('/auth/login', payload)
    return response.data
  },

  async me(): Promise<AuthUser> {
    const response = await http.get<AuthUser>('/auth/me')
    return response.data
  },

  async logout(): Promise<void> {
    await http.post<null>('/auth/logout')
  },
}
