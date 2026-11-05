import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import type { AuthSession, AuthUser, LoginPayload } from '@/types/auth'
import { ApiError } from '@/utils/api-error'

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

const { default: LoginPage } = await import('@/pages/LoginPage.vue')

const Blank = { render: () => null }

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: Blank },
  { path: '/dashboard', name: 'dashboard', component: Blank },
  { path: '/pos', name: 'pos', component: Blank },
]

const session: AuthSession = {
  token: 'jwt-token',
  token_type: 'Bearer',
  expires_in: '8h',
  user: {
    id: 'cashier-1',
    name: 'Siti Rahma',
    email: 'kasir1@pos.local',
    role: 'CASHIER',
    permissions: ['transaction:create', 'transaction:read:own'],
  },
}

const mountPage = async () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push('/login')
  await router.isReady()

  const wrapper = mount(LoginPage, {
    global: { plugins: [pinia, router] },
  })

  return { wrapper, router }
}

const fillCredentials = async (wrapper: Awaited<ReturnType<typeof mountPage>>['wrapper']) => {
  const inputs = wrapper.findAll('input')
  await inputs[0]!.setValue('kasir1@pos.local')
  await inputs[1]!.setValue('secret')
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('menampilkan error validasi saat form kosong', async () => {
    const { wrapper } = await mountPage()

    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Email dan password wajib diisi.')
    expect(mocks.login).not.toHaveBeenCalled()
  })

  it('menampilkan pesan dari API saat login gagal', async () => {
    mocks.login.mockRejectedValue(new ApiError('Email atau password salah', 401, 'INVALID_CREDENTIALS'))
    const { wrapper } = await mountPage()

    await fillCredentials(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Email atau password salah')
  })

  it('mengirim kredensial lowercase dan redirect Cashier ke /pos', async () => {
    mocks.login.mockResolvedValue(session)
    const { wrapper, router } = await mountPage()

    await wrapper.findAll('input')[0]!.setValue('  KASIR1@POS.LOCAL  ')
    await wrapper.findAll('input')[1]!.setValue('secret')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mocks.login).toHaveBeenCalledWith({
      email: 'kasir1@pos.local',
      password: 'secret',
    })
    expect(router.currentRoute.value.name).toBe('pos')
  })

  it('menonaktifkan tombol submit selama proses login', async () => {
    let resolveLogin: (value: AuthSession) => void = () => {}
    mocks.login.mockImplementation(
      () =>
        new Promise<AuthSession>((resolve) => {
          resolveLogin = resolve
        }),
    )
    const { wrapper } = await mountPage()

    await fillCredentials(wrapper)
    await wrapper.find('form').trigger('submit')
    await nextTick()

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()

    resolveLogin(session)
    await flushPromises()
  })

  it('tombol lihat mengganti tipe input password', async () => {
    const { wrapper } = await mountPage()
    const passwordInput = wrapper.findAll('input')[1]!

    expect(passwordInput.attributes('type')).toBe('password')

    await wrapper.find('button[type="button"]').trigger('click')

    expect(passwordInput.attributes('type')).toBe('text')
  })
})
