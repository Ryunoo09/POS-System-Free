import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type {
  CashMovementPayload,
  CloseShiftPayload,
  OpenShiftPayload,
  Shift,
  ShiftHistoryParams,
  ShiftSummary,
} from '@/types/shift'
import type { PaginationMeta } from '@/types/api'

const mocks = vi.hoisted(() => ({
  getCurrentShift: vi.fn<() => Promise<Shift | null>>(),
  openShift: vi.fn<(payload: OpenShiftPayload) => Promise<Shift>>(),
  closeShift: vi.fn<(payload: CloseShiftPayload) => Promise<Shift>>(),
  createCashMovement: vi.fn<(payload: CashMovementPayload) => Promise<Shift>>(),
  getSummary: vi.fn<() => Promise<ShiftSummary>>(),
  getHistory: vi.fn<(params?: ShiftHistoryParams) => Promise<{ items: Shift[]; meta?: PaginationMeta }>>(),
}))

vi.mock('@/services/shift.service', () => ({
  shiftService: {
    getCurrentShift: mocks.getCurrentShift,
    openShift: mocks.openShift,
    closeShift: mocks.closeShift,
    createCashMovement: mocks.createCashMovement,
    getSummary: mocks.getSummary,
    getHistory: mocks.getHistory,
  },
}))

const { useShiftStore } = await import('../shift.store')

describe('shift.store', () => {
  const dummyShift: Shift = {
    id: 'shift-1',
    cashier: { id: 'c-1', name: 'Kasir Uji' },
    status: 'OPEN',
    starting_cash: '50000.00',
    expected_cash: null,
    actual_cash: null,
    cash_difference: null,
    difference_note: null,
    total_sales: null,
    non_cash_sales: null,
    cash_movements: [],
    opened_at: '2026-11-09T08:00:00Z',
    closed_at: null,
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('memuat current shift dan mengidentifikasi status aktif', async () => {
    mocks.getCurrentShift.mockResolvedValue(dummyShift)
    const store = useShiftStore()

    const result = await store.fetchCurrentShift()

    expect(result?.id).toBe('shift-1')
    expect(store.isShiftOpen).toBe(true)
  })

  it('membuka shift baru', async () => {
    mocks.openShift.mockResolvedValue(dummyShift)
    const store = useShiftStore()

    const result = await store.openShift({ starting_cash: 50000 })

    expect(mocks.openShift).toHaveBeenCalledWith({ starting_cash: 50000 })
    expect(result.id).toBe('shift-1')
    expect(store.currentShift?.status).toBe('OPEN')
  })

  it('menutup shift dan mereset status aktif', async () => {
    const closedShift: Shift = {
      ...dummyShift,
      status: 'CLOSED',
      expected_cash: '70000.00',
      actual_cash: '70000.00',
      cash_difference: '0.00',
      closed_at: '2026-11-09T17:00:00Z',
    }
    mocks.closeShift.mockResolvedValue(closedShift)
    const store = useShiftStore()
    store.currentShift = dummyShift

    await store.closeShift({ actual_cash: 70000 })

    expect(mocks.closeShift).toHaveBeenCalledWith({ actual_cash: 70000 })
    expect(store.currentShift).toBeNull()
    expect(store.isShiftOpen).toBe(false)
  })

  it('mencatat mutasi kas masuk/keluar', async () => {
    const updatedShift: Shift = {
      ...dummyShift,
      cash_movements: [
        {
          id: 'mov-1',
          shift_id: 'shift-1',
          type: 'CASH_OUT',
          amount: '10000.00',
          reason: 'Beli bensin',
          created_by: { id: 'c-1', name: 'Kasir Uji' },
          created_at: '2026-11-09T10:00:00Z',
        },
      ],
    }
    mocks.createCashMovement.mockResolvedValue(updatedShift)
    const store = useShiftStore()

    await store.createCashMovement({
      type: 'CASH_OUT',
      amount: 10000,
      reason: 'Beli bensin',
    })

    expect(mocks.createCashMovement).toHaveBeenCalledWith({
      type: 'CASH_OUT',
      amount: 10000,
      reason: 'Beli bensin',
    })
    expect(store.currentShift?.cash_movements).toHaveLength(1)
  })

  it('mengambil ringkasan saldo shift sistem', async () => {
    const summary: ShiftSummary = {
      starting_cash: '50000.00',
      cash_sales: '200000.00',
      non_cash_sales: '120000.00',
      total_sales: '320000.00',
      cash_in: '10000.00',
      cash_out: '5000.00',
      expected_cash: '255000.00',
      payment_breakdown: [
        { payment_method: 'CASH', transaction_count: 4, revenue: '200000.00' },
        { payment_method: 'QRIS', transaction_count: 2, revenue: '120000.00' },
      ],
    }
    mocks.getSummary.mockResolvedValue(summary)
    const store = useShiftStore()

    const res = await store.fetchSummary()

    expect(res?.expected_cash).toBe('255000.00')
    expect(store.summary?.expected_cash).toBe('255000.00')
  })
})
