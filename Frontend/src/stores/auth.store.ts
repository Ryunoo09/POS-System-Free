import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { authService } from '@/services/auth.service'
import type { AuthSession, AuthUser, LoginPayload } from '@/types/auth'
import { TOKEN_STORAGE_KEY } from '@/utils/constants'
import { hasAnyPermission, hasPermission } from '@/utils/permissions'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_STORAGE_KEY))
  const user = ref<AuthUser | null>(null)
  const isLoading = ref(false)

  const permissions = computed(() => user.value?.permissions ?? [])
  const isAuthenticated = computed(() => Boolean(token.value && user.value))

  const setSession = (session: AuthSession) => {
    token.value = session.token
    user.value = session.user
    localStorage.setItem(TOKEN_STORAGE_KEY, session.token)
  }

  const login = async (payload: LoginPayload): Promise<AuthUser> => {
    isLoading.value = true

    try {
      const session = await authService.login(payload)
      setSession(session)
      return session.user
    } finally {
      isLoading.value = false
    }
  }

  const fetchMe = async (): Promise<AuthUser | null> => {
    if (!token.value) return null

    const currentUser = await authService.me()
    user.value = currentUser
    return currentUser
  }

  const logout = () => {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }

  const can = (permission: string): boolean => hasPermission(permissions.value, permission)

  const canAny = (required: readonly string[]): boolean =>
    hasAnyPermission(permissions.value, required)

  return {
    token,
    user,
    isLoading,
    permissions,
    isAuthenticated,
    login,
    fetchMe,
    logout,
    hasPermission: can,
    hasAnyPermission: canAny,
  }
})
