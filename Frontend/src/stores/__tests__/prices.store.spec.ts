import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type {
  BulkPriceItem,
  PriceHistoryEntry,
  SchedulePricePayload,
  ScheduledPrice,
} from '@/types/price'

const mocks = vi.hoisted(() => ({
  history: vi.fn<(productId: string) => Promise<PriceHistoryEntry[]>>(),
  schedule: vi.fn<(productId: string, payload: SchedulePricePayload) => Promise<ScheduledPrice>>(),
  activeSchedule: vi.fn<(productId: string) => Promise<ScheduledPrice | null>>(),
  cancelSchedule: vi.fn<(productId: string, scheduleId: string) => Promise<void>>(),
  bulkPreview: vi.fn<(...args: unknown[]) => Promise<BulkPriceItem[]>>(),
  bulkApply: vi.fn<(...args: unknown[]) => Promise<{ updated: number }>>(),
}))

vi.mock('@/services/prices.service', () => ({
  pricesService: {
    history: mocks.history,
    schedule: mocks.schedule,
    activeSchedule: mocks.activeSchedule,
    cancelSchedule: mocks.cancelSchedule,
    bulkPreview: mocks.bulkPreview,
    bulkApply: mocks.bulkApply,
  },
}))

const { usePricesStore } = await import('../prices.store')

const historyEntry: PriceHistoryEntry = {
  id: 'history-1',
  field: 'SELLING_PRICE',
  old_value: '1500.00',
  new_value: '2000.00',
  source: 'MANUAL',
  reason: null,
  changed_by: { id: 'admin-1', name: 'Admin' },
  created_at: '2026-11-11T00:00:00.000Z',
}

const schedule: ScheduledPrice = {
  id: 'schedule-1',
  selling_price: '2500.00',
  effective_date: '2026-12-01T00:00:00.000Z',
  status: 'SCHEDULED',
  reason: 'Naik harga',
  applied_at: null,
  created_at: '2026-11-11T00:00:00.000Z',
}

describe('prices.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('memuat riwayat harga', async () => {
    mocks.history.mockResolvedValue([historyEntry])
    const store = usePricesStore()

    await store.fetchHistory('product-1')

    expect(store.history).toEqual([historyEntry])
    expect(store.isLoading).toBe(false)
  })

  it('menyimpan lalu membatalkan jadwal harga', async () => {
    mocks.schedule.mockResolvedValue(schedule)
    const store = usePricesStore()

    await store.saveSchedule('product-1', {
      selling_price: 2500,
      effective_date: '2026-12-01T00:00:00.000Z',
      reason: 'Naik harga',
    })

    expect(store.schedule).toEqual(schedule)

    mocks.cancelSchedule.mockResolvedValue()
    await store.cancelSchedule('product-1', 'schedule-1')

    expect(store.schedule).toBeNull()
  })

  it('menghitung preview dan mengirim apply massal', async () => {
    mocks.bulkPreview.mockResolvedValue([
      { id: 'product-1', name: 'Produk', sku: 'SKU-1', old_price: '1500.00', new_price: '1650.00' },
    ])
    mocks.bulkApply.mockResolvedValue({ updated: 3 })
    const store = usePricesStore()

    await store.previewBulk({ mode: 'PERCENT', value: 10, product_ids: ['product-1'] })
    expect(store.preview[0]?.new_price).toBe('1650.00')

    const updated = await store.applyBulk({
      mode: 'PERCENT',
      value: 10,
      product_ids: ['product-1'],
      reason: 'Penyesuaian pasar',
    })

    expect(updated).toBe(3)
  })
})
