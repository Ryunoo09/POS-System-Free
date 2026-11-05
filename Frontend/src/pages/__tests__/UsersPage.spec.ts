import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ListResult } from '@/types/api'
import type { AuthUser } from '@/types/auth'
import type { User, UserCreatePayload, UserListParams, UserUpdatePayload } from '@/types/user'
import { useAuthStore } from '@/stores/auth.store'

const mocks = vi.hoisted(() => ({
  list: vi.fn<(params: UserListParams) => Promise<ListResult<User>>>(),
  create: vi.fn<(payload: UserCreatePayload) => Promise<User>>(),
  update: vi.fn<(id: string, payload: UserUpdatePayload) => Promise<User>>(),
}))

vi.mock('@/services/users.service', () => ({
  usersService: {
    list: mocks.list,
    create: mocks.create,
    update: mocks.update,
  },
}))

const { default: UsersPage } = await import('@/pages/UsersPage.vue')

const admin: AuthUser = {
  id: 'admin-1',
  name: 'Admin Toko',
  email: 'admin@pos.local',
  role: 'ADMIN',
  permissions: ['user:manage'],
}

const selfUser: User = {
  id: 'admin-1',
  name: 'Admin Toko',
  email: 'admin@pos.local',
  role: 'ADMIN',
  is_active: true,
  created_at: '2026-11-01T00:00:00.000Z',
  updated_at: '2026-11-01T00:00:00.000Z',
}

const cashier: User = {
  id: 'cashier-1',
  name: 'Siti Rahma',
  email: 'kasir1@pos.local',
  role: 'CASHIER',
  is_active: true,
  created_at: '2026-11-01T00:00:00.000Z',
  updated_at: '2026-11-01T00:00:00.000Z',
}

const mountPage = async () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().user = admin

  const wrapper = mount(UsersPage, {
    global: {
      plugins: [pinia],
      stubs: { teleport: true },
    },
  })

  await flushPromises()

  return wrapper
}

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.list.mockResolvedValue({
      items: [selfUser, cashier],
      meta: { page: 1, limit: 10, total_items: 2, total_pages: 1 },
    })
  })

  it('menonaktifkan tombol nonaktifkan untuk akun sendiri', async () => {
    const wrapper = await mountPage()
    const rows = wrapper.findAll('tbody tr')

    const selfRow = rows.find((row) => row.text().includes('admin@pos.local'))
    const cashierRow = rows.find((row) => row.text().includes('kasir1@pos.local'))

    expect(selfRow).toBeDefined()
    expect(cashierRow).toBeDefined()

    const selfToggle = selfRow
      ?.findAll('button')
      .find((button) => button.text() === 'Nonaktifkan')
    const cashierToggle = cashierRow
      ?.findAll('button')
      .find((button) => button.text() === 'Nonaktifkan')

    expect(selfToggle?.attributes('disabled')).toBeDefined()
    expect(selfToggle?.attributes('title')).toBe('Tidak dapat menonaktifkan akun sendiri')
    expect(cashierToggle?.attributes('disabled')).toBeUndefined()
  })

  it('menampilkan role dan status pengguna', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Admin')
    expect(wrapper.text()).toContain('Kasir')
    expect(wrapper.text()).toContain('Aktif')
    expect(wrapper.text()).toContain('(Anda)')
  })
})