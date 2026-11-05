import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { AuthSession, AuthUser, LoginPayload } from '@/types/auth'
import { TOKEN_STORAGE_KEY } from '@/utils/constants'

const mocks = vi.hoisted(() => ({
  login: vi.fn<(payload: LoginPayload) => Promise<AuthSession>>(),
  me: vi.fn<() => Promise<AuthUser>>(),
  logout: vi.fn<() => Promise<void>>(),
}))

vi.mock('@/services/auth.service', () => ({
  authService: {
    login: mocks.login,
    me: mocks.me,
    logout: mocks.logout,
  },
}))

const { useAuthStore } = await import('../auth.store')

const session: AuthSession = {
  token: 'jwt-token',
  token_type: 'Bearer',
  expires_in: '8h',
  user: {
    id: 'user-1',
    name: 'Siti Rahma',
    email: 'kasir@pos.local',
    role: 'CASHIER',
    permissions: ['transaction:create', 'transaction:read:own'],
  },
}

describe('auth.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('menyimpan token dan user setelah login', async () => {
    mocks.login.mockResolvedValue(session)
    const store = useAuthStore()

    const user = await store.login({ email: 'kasir@pos.local', password: 'secret' })

    expect(user.role).toBe('CASHIER')
    expect(store.token).toBe('jwt-token')
    expect(store.isAuthenticated).toBe(true)
    expect(store.hasPermission('transaction:create')).toBe(true)
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('jwt-token')
  })

  it('memuat user dari endpoint me', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'jwt-token')
    mocks.me.mockResolvedValue(session.user)
    const store = useAuthStore()

    const user = await store.fetchMe()

    expect(user?.name).toBe('Siti Rahma')
    expect(store.hasAnyPermission(['dashboard:read', 'transaction:create'])).toBe(true)
  })

  it('membersihkan token dan user saat logout', () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'jwt-token')
    const store = useAuthStore()

    store.logout()

    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull()
  })
})
