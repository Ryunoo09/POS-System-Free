import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useShiftStore } from '../shift.store'
import { shiftService } from '@/services/shift.service'
import type { Shift, ShiftSummary } from '@/types/shift'

vi.mock('@/services/shift.service', () => ({
  shiftService: {
    getCurrentShift: vi.fn(),
    openShift: vi.fn(),
    closeShift: vi.fn(),
    createCashMovement: vi.fn(),
    getSummary: vi.fn(),
    getHistory: vi.fn(),
  },
}))

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
    cash_movements: [],
    opened_at: '2026-11-09T08:00:00Z',
    closed_at: null,
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('memuat current shift dan mengidentifikasi status aktif', async () => {
    vi.mocked(shiftService.getCurrentShift).mockResolvedValue(dummyShift)
    const store = useShiftStore()

    const result = await store.fetchCurrentShift()

    expect(result?.id).toBe('shift-1')
    expect(store.isShiftOpen).toBe(true)
  })

  it('membuka shift baru', async () => {
    vi.mocked(shiftService.openShift).mockResolvedValue(dummyShift)
    const store = useShiftStore()

    const result = await store.openShift({ starting_cash: 50000 })

    expect(shiftService.openShift).toHaveBeenCalledWith({ starting_cash: 50000 })
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
    vi.mocked(shiftService.closeShift).mockResolvedValue(closedShift)
    const store = useShiftStore()
    store.currentShift = dummyShift

    await store.closeShift({ actual_cash: 70000 })

    expect(shiftService.closeShift).toHaveBeenCalledWith({ actual_cash: 70000 })
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
    vi.mocked(shiftService.createCashMovement).mockResolvedValue(updatedShift)
    const store = useShiftStore()

    await store.createCashMovement({
      type: 'CASH_OUT',
      amount: 10000,
      reason: 'Beli bensin',
    })

    expect(shiftService.createCashMovement).toHaveBeenCalledWith({
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
      cash_in: '10000.00',
      cash_out: '5000.00',
      expected_cash: '255000.00',
    }
    vi.mocked(shiftService.getSummary).mockResolvedValue(summary)
    const store = useShiftStore()

    const res = await store.fetchSummary()

    expect(res?.expected_cash).toBe('255000.00')
    expect(store.summary?.expected_cash).toBe('255000.00')
  })
})
