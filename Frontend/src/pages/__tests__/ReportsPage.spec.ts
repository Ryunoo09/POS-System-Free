import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DateRange } from '@/types/dashboard'
import type {
  CashierReportRow,
  ProductReportParams,
  ProductReportPayload,
  ReportPayload,
  SalesReportParams,
  SalesReportRow,
} from '@/types/report'

const mocks = vi.hoisted(() => ({
  getSales: vi.fn<(params: SalesReportParams) => Promise<ReportPayload<SalesReportRow>>>(),
  getProducts: vi.fn<(params: ProductReportParams) => Promise<ProductReportPayload>>(),
  getCashiers: vi.fn<(params: DateRange) => Promise<ReportPayload<CashierReportRow>>>(),
  listCategories: vi.fn<() => Promise<unknown>>(),
  getShifts: vi.fn<() => Promise<unknown>>(),
}))

vi.mock('@/services/reports.service', () => ({
  reportsService: {
    getSales: mocks.getSales,
    getProducts: mocks.getProducts,
    getCashiers: mocks.getCashiers,
  },
}))

vi.mock('@/services/shift.service', () => ({
  shiftService: {
    getHistory: mocks.getShifts,
  },
}))

vi.mock('@/services/categories.service', () => ({
  categoriesService: {
    list: mocks.listCategories,
  },
}))

const { default: ReportsPage } = await import('@/pages/ReportsPage.vue')

const summary = {
  revenue: '140000.00',
  cogs: '80000.00',
  gross_profit: '60000.00',
  transaction_count: 2,
}

const mountPage = async () => {
  const pinia = createPinia()
  setActivePinia(pinia)

  const wrapper = mount(ReportsPage, {
    global: {
      plugins: [pinia],
      stubs: { teleport: true },
    },
  })

  await flushPromises()

  return wrapper
}

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getShifts.mockResolvedValue({
      items: [],
      meta: { page: 1, limit: 10, total_items: 0, total_pages: 1 },
    })
    mocks.listCategories.mockResolvedValue({
      items: [{ id: 'cat-1', name: 'Minuman' }],
      meta: { page: 1, limit: 100, total_items: 1, total_pages: 1 },
    })
    mocks.getSales.mockResolvedValue({
      summary,
      rows: [
        {
          period: '2026-11-01',
          period_label: '1 Nov 2026',
          transaction_count: 1,
          revenue: '90000.00',
          cogs: '60000.00',
          gross_profit: '30000.00',
        },
      ],
    })
    mocks.getProducts.mockResolvedValue({
      summary,
      rows: [
        {
          product_id: 'product-1',
          sku: 'SKU-1',
          name: 'Kopi Susu',
          category: 'Minuman',
          quantity_sold: 3,
          revenue: '30000.00',
          cogs: '15000.00',
          gross_profit: '15000.00',
        },
      ],
      meta: { page: 1, limit: 10, total_items: 1, total_pages: 1 },
    })
    mocks.getCashiers.mockResolvedValue({
      summary,
      rows: [
        {
          cashier_id: 'cashier-1',
          cashier_name: 'Kasir Satu',
          transaction_count: 2,
          revenue: '140000.00',
          gross_profit: '60000.00',
          average_transaction: '70000.00',
        },
      ],
    })
  })

  it('memuat ringkasan, penjualan, produk, dan kasir saat dibuka', async () => {
    const wrapper = await mountPage()

    expect(mocks.getSales).toHaveBeenCalledOnce()
    expect(mocks.getProducts).toHaveBeenCalledOnce()
    expect(mocks.getCashiers).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('140.000')
    expect(wrapper.text()).toContain('1 Nov 2026')
  })

  it('mengganti tab menampilkan tabel produk dan kasir', async () => {
    const wrapper = await mountPage()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Per Produk')
      ?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Kopi Susu')
    expect(wrapper.text()).toContain('Minuman')

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Per Kasir')
      ?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Kasir Satu')
  })

  it('mengubah kelompok penjualan memuat ulang laporan', async () => {
    const wrapper = await mountPage()

    await wrapper.find('select').setValue('weekly')
    await flushPromises()

    expect(mocks.getSales).toHaveBeenLastCalledWith(
      expect.objectContaining({ group_by: 'weekly' }),
    )
  })
})
