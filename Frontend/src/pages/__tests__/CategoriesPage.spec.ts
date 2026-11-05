import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ListResult } from '@/types/api'
import type {
  Category,
  CategoryCreatePayload,
  CategoryListParams,
  CategoryUpdatePayload,
} from '@/types/category'
import type { AuthUser } from '@/types/auth'
import { ApiError } from '@/utils/api-error'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'

const mocks = vi.hoisted(() => ({
  list: vi.fn<(params: CategoryListParams) => Promise<ListResult<Category>>>(),
  create: vi.fn<(payload: CategoryCreatePayload) => Promise<Category>>(),
  update: vi.fn<(id: string, payload: CategoryUpdatePayload) => Promise<Category>>(),
  remove: vi.fn<(id: string) => Promise<Category>>(),
}))

vi.mock('@/services/categories.service', () => ({
  categoriesService: {
    list: mocks.list,
    create: mocks.create,
    update: mocks.update,
    remove: mocks.remove,
  },
}))

const { default: CategoriesPage } = await import('@/pages/CategoriesPage.vue')

const admin: AuthUser = {
  id: 'admin-1',
  name: 'Admin Toko',
  email: 'admin@pos.local',
  role: 'ADMIN',
  permissions: ['category:read', 'category:write', 'product:read', 'product:write'],
}

const category: Category = {
  id: 'cat-1',
  name: 'Minuman',
  description: 'Aneka minuman',
  is_active: true,
  product_count: 3,
  created_at: '2026-11-01T00:00:00.000Z',
  updated_at: '2026-11-01T00:00:00.000Z',
}

const mountPage = async () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().user = admin

  const wrapper = mount(CategoriesPage, {
    global: {
      plugins: [pinia],
      stubs: { teleport: true },
    },
  })

  await flushPromises()

  return { wrapper, pinia }
}

describe('CategoriesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.list.mockResolvedValue({
      items: [category],
      meta: { page: 1, limit: 10, total_items: 1, total_pages: 1 },
    })
  })

  it('menampilkan daftar kategori dari API', async () => {
    const { wrapper } = await mountPage()

    expect(mocks.list).toHaveBeenCalledWith({ page: 1, limit: 10 })
    expect(wrapper.text()).toContain('Minuman')
    expect(wrapper.text()).toContain('3')
  })

  it('menampilkan pesan 409 CATEGORY_IN_USE saat hapus gagal', async () => {
    const message = 'Kategori masih dipakai 3 produk. Nonaktifkan sebagai gantinya.'
    mocks.remove.mockRejectedValue(
      new ApiError(message, 409, 'CATEGORY_IN_USE', [{ field: 'id', message }]),
    )

    const { wrapper, pinia } = await mountPage()

    const deleteButton = wrapper.findAll('button').find((button) => button.text() === 'Hapus')
    expect(deleteButton).toBeDefined()

    await deleteButton?.trigger('click')
    await flushPromises()

    const confirmButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Ya, hapus')
    expect(confirmButton).toBeDefined()

    await confirmButton?.trigger('click')
    await flushPromises()

    expect(mocks.remove).toHaveBeenCalledWith('cat-1')
    expect(useUiStore(pinia).toasts.map((toast) => toast.message)).toContain(message)
  })
})