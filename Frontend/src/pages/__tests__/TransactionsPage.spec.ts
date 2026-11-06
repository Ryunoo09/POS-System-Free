import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ListResult } from '@/types/api'
import type { AuthUser } from '@/types/auth'
import type {
  TransactionCashierOption,
  TransactionListParams,
  TransactionSummary,
} from '@/types/transaction'
import { useAuthStore } from '@/stores/auth.store'

const mocks = vi.hoisted(() => ({
  list: vi.fn<(params: TransactionListParams) => Promise<ListResult<TransactionSummary>>>(),
  cashiers: vi.fn<() => Promise<TransactionCashierOption[]>>(),
  push: vi.fn<(path: string) => void>(),
}))

vi.mock('@/services/transactions.service', () => ({
  transactionsService: {
    list: mocks.list,
    cashiers: mocks.cashiers,
  },
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push }),
}))

const { default: TransactionsPage } = await import('@/pages/TransactionsPage.vue')

const summary: TransactionSummary = {
  id: 'tx-1',
  invoice_number: 'INV-20261106-000001',
  cashier: { id: 'cashier-1', name: 'Kasir Satu' },
  status: 'COMPLETED',
  subtotal: '7000.00',
  discount_amount: '0.00',
  tax_amount: '0.00',
  total_amount: '7000.00',
  payment_method: 'CASH',
  item_count: 1,
  created_at: '2026-11-06T03:00:00.000Z',
}

const admin: AuthUser = {
  id: 'admin-1',
  name: 'Admin Toko',
  email: 'admin@pos.local',
  role: 'ADMIN',
  permissions: ['transaction:read:all', 'cost-price:read'],
}

const cashier: AuthUser = {
  id: 'cashier-1',
  name: 'Kasir Satu',
  email: 'kasir@pos.local',
  role: 'CASHIER',
  permissions: ['transaction:read:own'],
}

const mountPage = async (user: AuthUser) => {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().user = user

  const wrapper = mount(TransactionsPage, {
    global: {
      plugins: [pinia],
      stubs: { teleport: true },
    },
  })

  await flushPromises()

  return wrapper
}

describe('TransactionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.list.mockResolvedValue({
      items: [summary],
      meta: { page: 1, limit: 10, total_items: 1, total_pages: 1 },
    })
    mocks.cashiers.mockResolvedValue([{ id: 'cashier-1', name: 'Kasir Satu' }])
  })

  it('menampilkan transaksi dan filter kasir untuk Admin', async () => {
    const wrapper = await mountPage(admin)
    const labels = wrapper.findAll('label').map((label) => label.text())

    expect(wrapper.text()).toContain('INV-20261106-000001')
    expect(wrapper.text()).toContain('Kasir Satu')
    expect(wrapper.text()).toContain('Tunai')
    expect(wrapper.text()).toContain('Selesai')
    expect(labels).toContain('Kasir')
    expect(mocks.cashiers).toHaveBeenCalledOnce()
  })

  it('menyembunyikan filter kasir untuk kasir', async () => {
    const wrapper = await mountPage(cashier)
    const labels = wrapper.findAll('label').map((label) => label.text())

    expect(labels).not.toContain('Kasir')
    expect(wrapper.text()).toContain('Hanya transaksi Anda')
    expect(mocks.cashiers).not.toHaveBeenCalled()
  })

  it('menerapkan filter dan mereset halaman', async () => {
    const wrapper = await mountPage(admin)
    const selects = wrapper.findAll('select')

    await wrapper.find('input[inputmode="search"]').setValue('INV-2026')
    await selects[1]?.setValue('COMPLETED')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Terapkan')
      ?.trigger('click')
    await flushPromises()

    expect(mocks.list).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 10,
        status: 'COMPLETED',
        search: 'INV-2026',
        start_date: expect.any(String),
        end_date: expect.any(String),
      }),
    )

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Reset')
      ?.trigger('click')
    await flushPromises()

    const lastParams = mocks.list.mock.lastCall?.[0]
    expect(lastParams?.page).toBe(1)
    expect(lastParams?.status).toBeUndefined()
    expect(lastParams?.search).toBeUndefined()
  })

  it('membuka detail saat baris diklik', async () => {
    const wrapper = await mountPage(admin)

    await wrapper.find('tbody tr').trigger('click')

    expect(mocks.push).toHaveBeenCalledWith('/transactions/tx-1')
  })

  it('menampilkan empty state saat tidak ada transaksi', async () => {
    mocks.list.mockResolvedValue({
      items: [],
      meta: { page: 1, limit: 10, total_items: 0, total_pages: 0 },
    })
    const wrapper = await mountPage(admin)

    expect(wrapper.text()).toContain('Tidak ada transaksi untuk filter ini')
  })
})
