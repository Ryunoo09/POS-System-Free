import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StockOpnameDetail } from '@/types/stock-opname'
import { useAuthStore } from '@/stores/auth.store'

const mocks = vi.hoisted(() => ({
  get: vi.fn<(id: string) => Promise<StockOpnameDetail>>(),
  start: vi.fn<(id: string) => Promise<StockOpnameDetail>>(),
  submit: vi.fn<(id: string) => Promise<StockOpnameDetail>>(),
  updateItem:
    vi.fn<
      (
        id: string,
        itemId: string,
        payload: { physical_stock: number; reason?: string },
      ) => Promise<StockOpnameDetail['items'][number]>
    >(),
}))

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return {
    ...actual,
    useRoute: () => ({ params: { id: 'session-1' } }),
  }
})

vi.mock('@/services/stock-opnames.service', () => ({
  stockOpnamesService: {
    get: mocks.get,
    start: mocks.start,
    submit: mocks.submit,
    updateItem: mocks.updateItem,
  },
}))

const { default: StockOpnameDetailPage } = await import('@/pages/StockOpnameDetailPage.vue')

const buildDetail = (overrides: Partial<StockOpnameDetail> = {}): StockOpnameDetail => ({
  id: 'session-1',
  session_number: 'OPN-20261111-ABCD1234',
  name: 'Opname Harian',
  status: 'IN_PROGRESS',
  scope: 'ALL',
  notes: null,
  rejection_reason: null,
  created_by: { id: 'admin-1', name: 'Admin' },
  approved_by: null,
  submitted_at: null,
  approved_at: null,
  rejected_at: null,
  completed_at: null,
  created_at: '2026-11-11T03:00:00.000Z',
  updated_at: '2026-11-11T03:00:00.000Z',
  total_items: 1,
  counted_items: 0,
  uncounted_items: 1,
  positive_differences: 0,
  negative_differences: 0,
  zero_differences: 0,
  total_adjustment_quantity: 0,
  items: [
    {
      id: 'item-1',
      product_id: 'product-1',
      sku: 'MKN-001',
      barcode: '2000000000017',
      name: 'Kopi Susu',
      system_stock: 10,
      physical_stock: null,
      difference: null,
      reason: null,
      counted_by: null,
      counted_at: null,
    },
  ],
  ...overrides,
})

const mountPage = async (detail: StockOpnameDetail) => {
  mocks.get.mockResolvedValue(detail)

  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().user = {
    id: 'admin-1',
    name: 'Admin',
    email: 'admin@pos.local',
    role: 'ADMIN',
    permissions: ['stock_opname:read', 'stock_opname:manage', 'stock_opname:approve'],
  }

  const wrapper = mount(StockOpnameDetailPage, {
    global: {
      plugins: [pinia],
      stubs: { RouterLink: true, teleport: true },
    },
  })

  await flushPromises()
  return wrapper
}

describe('StockOpnameDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('memuat detail sesi dan menampilkan item', async () => {
    const wrapper = await mountPage(buildDetail())

    expect(mocks.get).toHaveBeenCalledWith('session-1')
    expect(wrapper.text()).toContain('Kopi Susu')
    expect(wrapper.text()).toContain('OPN-20261111-ABCD1234')
  })

  it('memulai sesi DRAFT lewat tombol Mulai Hitung', async () => {
    mocks.start.mockResolvedValue(buildDetail())
    const wrapper = await mountPage(buildDetail({ status: 'DRAFT' }))

    const startButton = wrapper.findAll('button').find((button) => button.text() === 'Mulai Hitung')
    expect(startButton).toBeDefined()

    await startButton?.trigger('click')
    await flushPromises()

    expect(mocks.start).toHaveBeenCalledWith('session-1')
  })

  it('menyimpan stok fisik saat input blur', async () => {
    mocks.updateItem.mockResolvedValue({
      ...buildDetail().items[0]!,
      physical_stock: 8,
      difference: -2,
    })
    const wrapper = await mountPage(buildDetail())

    const physicalInput = wrapper.find('input[type="number"]')
    await physicalInput.setValue('8')
    await physicalInput.trigger('blur')
    await flushPromises()

    expect(mocks.updateItem).toHaveBeenCalledWith('session-1', 'item-1', {
      physical_stock: 8,
    })
  })

  it('mengirim sesi untuk approval', async () => {
    mocks.submit.mockResolvedValue(buildDetail({ status: 'SUBMITTED', counted_items: 1 }))
    const wrapper = await mountPage(
      buildDetail({
        counted_items: 1,
        uncounted_items: 0,
        items: [
          {
            ...buildDetail().items[0]!,
            physical_stock: 9,
            difference: -1,
          },
        ],
      }),
    )

    const submitButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Kirim Approval')
    expect(submitButton).toBeDefined()

    await submitButton?.trigger('click')
    await flushPromises()

    expect(mocks.submit).toHaveBeenCalledWith('session-1')
  })

  it('menyorot baris hasil scan barcode', async () => {
    const wrapper = await mountPage(buildDetail())

    const scanInput = wrapper.find('input[placeholder="Scan atau ketik lalu Enter"]')
    await scanInput.setValue('2000000000017')
    await scanInput.trigger('keydown.enter')
    await flushPromises()

    expect(wrapper.html()).toContain('bg-accent-soft')
  })
})