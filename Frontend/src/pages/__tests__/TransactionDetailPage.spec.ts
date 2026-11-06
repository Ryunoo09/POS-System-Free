import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthUser } from '@/types/auth'
import type { TransactionDetail } from '@/types/transaction'
import { ApiError } from '@/utils/api-error'
import { useAuthStore } from '@/stores/auth.store'

const mocks = vi.hoisted(() => ({
  detail: vi.fn<(id: string) => Promise<TransactionDetail>>(),
}))

vi.mock('@/services/transactions.service', () => ({
  transactionsService: {
    detail: mocks.detail,
  },
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'tx-1' } }),
  RouterLink: {
    props: ['to'],
    template: '<a :href="to"><slot /></a>',
  },
}))

const { default: TransactionDetailPage } = await import('@/pages/TransactionDetailPage.vue')

const detail: TransactionDetail = {
  id: 'tx-1',
  invoice_number: 'INV-20261106-000001',
  status: 'COMPLETED',
  cashier: { id: 'cashier-1', name: 'Kasir Satu' },
  items: [
    {
      product_id: 'product-1',
      product_name: 'Kopi Susu',
      product_sku: 'MKN-001',
      quantity: 2,
      unit_price: '3500.00',
      unit_cost: '2000.00',
      discount_amount: '0.00',
      subtotal: '7000.00',
    },
  ],
  subtotal: '7000.00',
  discount_amount: '500.00',
  tax_amount: '0.00',
  total_amount: '6500.00',
  payment_method: 'CASH',
  payment_reference: 'REF-1',
  amount_paid: '10000.00',
  change_amount: '3500.00',
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

  const wrapper = mount(TransactionDetailPage, {
    global: {
      plugins: [pinia],
      stubs: { teleport: true },
    },
  })

  await flushPromises()

  return wrapper
}

describe('TransactionDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.detail.mockResolvedValue(detail)
  })

  it('menampilkan snapshot, ringkasan, dan modal untuk Admin', async () => {
    const wrapper = await mountPage(admin)

    expect(wrapper.text()).toContain('INV-20261106-000001')
    expect(wrapper.text()).toContain('Kopi Susu')
    expect(wrapper.text()).toContain('MKN-001')
    expect(wrapper.text()).toContain('Rp 7.000')
    expect(wrapper.text()).toContain('Rp 6.500')
    expect(wrapper.text()).toContain('Rp 3.500')
    expect(wrapper.text()).toContain('REF-1')
    expect(wrapper.text()).toContain('Modal')
    expect(wrapper.text()).toContain('Rp 2.000')
  })

  it('menyembunyikan kolom modal untuk kasir', async () => {
    const wrapper = await mountPage(cashier)

    expect(wrapper.text()).toContain('Kopi Susu')
    expect(wrapper.text()).not.toContain('Modal')
  })

  it('menampilkan pesan tidak ditemukan untuk 404', async () => {
    mocks.detail.mockRejectedValue(new ApiError('Transaksi tidak ditemukan', 404, 'NOT_FOUND'))
    const wrapper = await mountPage(cashier)

    expect(wrapper.text()).toContain('Transaksi tidak ditemukan')
    expect(wrapper.text()).toContain('Kembali ke riwayat')
  })

  it('mencetak struk dari modal cetak ulang', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    const wrapper = await mountPage(admin)

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Cetak Ulang')
      ?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Struk Pembayaran')

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Cetak Struk')
      ?.trigger('click')

    expect(print).toHaveBeenCalledTimes(1)
    print.mockRestore()
  })
})
