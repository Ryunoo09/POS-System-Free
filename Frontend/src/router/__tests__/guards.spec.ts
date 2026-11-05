import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import type { AuthSession, AuthUser, LoginPayload } from '@/types/auth'
import { ApiError } from '@/utils/api-error'
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

const { useAuthStore } = await import('@/stores/auth.store')
const { installGuards } = await import('@/router/guards')

const Blank = { render: () => null }

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: Blank, meta: { public: true } },
  { path: '/', name: 'home', component: Blank },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: Blank,
    meta: { permissions: ['dashboard:read'] },
  },
  { path: '/pos', name: 'pos', component: Blank, meta: { permissions: ['transaction:create'] } },
  { path: '/403', name: 'forbidden', component: Blank, meta: { public: true } },
]

const admin: AuthUser = {
  id: 'admin-1',
  name: 'Andi',
  email: 'admin@pos.local',
  role: 'ADMIN',
  permissions: ['dashboard:read'],
}

const cashier: AuthUser = {
  id: 'cashier-1',
  name: 'Siti',
  email: 'kasir1@pos.local',
  role: 'CASHIER',
  permissions: ['transaction:create'],
}

const buildRouter = () => {
  const router = createRouter({ history: createMemoryHistory(), routes })
  installGuards(router)
  return router
}

describe('router guards', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('mengarahkan ke login beserta query redirect saat belum punya token', async () => {
    const router = buildRouter()

    await router.push('/dashboard')

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/dashboard')
  })

  it('Cashier yang membuka /dashboard diarahkan ke /403', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'token')
    mocks.me.mockResolvedValue(cashier)
    const router = buildRouter()

    await router.push('/dashboard')

    expect(router.currentRoute.value.name).toBe('forbidden')
  })

  it('Cashier boleh membuka /pos', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'token')
    mocks.me.mockResolvedValue(cashier)
    const router = buildRouter()

    await router.push('/pos')

    expect(router.currentRoute.value.name).toBe('pos')
  })

  it('Admin dialihkan dari / ke /dashboard', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'token')
    mocks.me.mockResolvedValue(admin)
    const router = buildRouter()

    await router.push('/')

    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('token tidak valid memicu logout dan kembali ke login', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'token')
    mocks.me.mockRejectedValue(new ApiError('Sesi tidak valid', 401, 'TOKEN_INVALID'))
    const router = buildRouter()

    await router.push('/dashboard')

    expect(router.currentRoute.value.name).toBe('login')
    expect(useAuthStore().token).toBeNull()
  })

  it('pengguna yang sudah login membuka /login dialihkan sesuai role', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'token')
    mocks.me.mockResolvedValue(cashier)
    const router = buildRouter()

    await router.push('/login')

    expect(router.currentRoute.value.name).toBe('pos')
  })
})
