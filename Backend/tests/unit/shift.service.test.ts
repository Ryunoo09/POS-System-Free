import { Prisma } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConflictError, NotFoundError } from '../../src/errors/app-errors.js'
import type { ShiftRepository, ShiftWithRelations } from '../../src/repositories/shift.repository.js'
import { createShiftService } from '../../src/services/shift.service.js'

describe('shift.service', () => {
  let mockRepo: ShiftRepository
  const cashierId = 'cashier-uuid-1'

  const dummyShift: ShiftWithRelations = {
    id: 'shift-uuid-1',
    cashierId,
    status: 'OPEN',
    startingCash: new Prisma.Decimal('100000.00'),
    expectedCash: null,
    actualCash: null,
    cashDifference: null,
    differenceNote: null,
    openedAt: new Date('2026-11-09T08:00:00Z'),
    closedAt: null,
    createdAt: new Date('2026-11-09T08:00:00Z'),
    cashier: { id: cashierId, name: 'Budi Kasir' },
    cashMovements: [],
    _count: { transactions: 5 },
  }

  beforeEach(() => {
    mockRepo = {
      findActiveByCashierId: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      close: vi.fn(),
      createCashMovement: vi.fn(),
      calculateShiftCashSummary: vi.fn(),
      findHistory: vi.fn(),
    }
  })

  it('mengembalikan shift aktif saat kasir memiliki shift terbuka', async () => {
    vi.mocked(mockRepo.findActiveByCashierId).mockResolvedValue(dummyShift)
    const service = createShiftService(mockRepo)

    const result = await service.getCurrentShift(cashierId)

    expect(result).not.toBeNull()
    expect(result?.id).toBe('shift-uuid-1')
    expect(result?.status).toBe('OPEN')
    expect(result?.starting_cash).toBe('100000.00')
  })

  it('mengembalikan null saat kasir tidak memiliki shift aktif', async () => {
    vi.mocked(mockRepo.findActiveByCashierId).mockResolvedValue(null)
    const service = createShiftService(mockRepo)

    const result = await service.getCurrentShift(cashierId)

    expect(result).toBeNull()
  })

  it('membuka shift baru dengan modal awal', async () => {
    vi.mocked(mockRepo.findActiveByCashierId).mockResolvedValue(null)
    vi.mocked(mockRepo.create).mockResolvedValue(dummyShift)
    const service = createShiftService(mockRepo)

    const result = await service.openShift(cashierId, { starting_cash: 100000 })

    expect(mockRepo.create).toHaveBeenCalledWith({
      cashierId,
      startingCash: 100000,
    })
    expect(result.id).toBe('shift-uuid-1')
  })

  it('menolak pembukaan shift jika kasir sudah punya shift aktif', async () => {
    vi.mocked(mockRepo.findActiveByCashierId).mockResolvedValue(dummyShift)
    const service = createShiftService(mockRepo)

    await expect(
      service.openShift(cashierId, { starting_cash: 50000 }),
    ).rejects.toThrow(ConflictError)
  })

  it('mengubah unique violation P2002 menjadi OPEN_SHIFT_EXISTS', async () => {
    vi.mocked(mockRepo.findActiveByCashierId).mockResolvedValue(null)
    vi.mocked(mockRepo.create).mockRejectedValue(
      Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }),
    )
    const service = createShiftService(mockRepo)

    await expect(
      service.openShift(cashierId, { starting_cash: 50000 }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'OPEN_SHIFT_EXISTS' })
  })

  it('menutup shift dan menghitung selisih kas', async () => {
    vi.mocked(mockRepo.findActiveByCashierId).mockResolvedValue(dummyShift)
    vi.mocked(mockRepo.calculateShiftCashSummary).mockResolvedValue({
      startingCash: 100000,
      cashSales: 150000,
      nonCashSales: 50000,
      totalSales: 200000,
      cashIn: 20000,
      cashOut: 10000,
      expectedCash: 260000,
      paymentBreakdown: [
        { paymentMethod: 'CASH', transactionCount: 2, revenue: 150000 },
        { paymentMethod: 'QRIS', transactionCount: 1, revenue: 50000 },
      ],
    })

    const closedShift: ShiftWithRelations = {
      ...dummyShift,
      status: 'CLOSED',
      expectedCash: new Prisma.Decimal('260000.00'),
      actualCash: new Prisma.Decimal('255000.00'),
      cashDifference: new Prisma.Decimal('-5000.00'),
      differenceNote: 'Selisih uang receh kembalian',
      closedAt: new Date('2026-11-09T16:00:00Z'),
    }
    vi.mocked(mockRepo.close).mockResolvedValue(closedShift)

    const service = createShiftService(mockRepo)
    const result = await service.closeShift(cashierId, {
      actual_cash: 255000,
      difference_note: 'Selisih uang receh kembalian',
    })

    expect(mockRepo.close).toHaveBeenCalledWith(
      'shift-uuid-1',
      expect.objectContaining({
        expectedCash: 260000,
        actualCash: 255000,
        cashDifference: -5000,
        differenceNote: 'Selisih uang receh kembalian',
      }),
    )
    expect(result.status).toBe('CLOSED')
    expect(result.cash_difference).toBe('-5000.00')
  })

  it('menolak penutupan bila shift sudah ditutup lebih dulu', async () => {
    vi.mocked(mockRepo.findActiveByCashierId).mockResolvedValue(dummyShift)
    vi.mocked(mockRepo.calculateShiftCashSummary).mockResolvedValue({
      startingCash: 100000,
      cashSales: 0,
      nonCashSales: 0,
      totalSales: 0,
      cashIn: 0,
      cashOut: 0,
      expectedCash: 100000,
      paymentBreakdown: [],
    })
    vi.mocked(mockRepo.close).mockResolvedValue(null)

    const service = createShiftService(mockRepo)

    await expect(
      service.closeShift(cashierId, { actual_cash: 100000 }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'SHIFT_ALREADY_CLOSED' })
  })

  it('mencatat mutasi kas masuk/keluar', async () => {    vi.mocked(mockRepo.findActiveByCashierId).mockResolvedValue(dummyShift)
    vi.mocked(mockRepo.createCashMovement).mockResolvedValue({
      id: 'mov-1',
      shiftId: dummyShift.id,
      type: 'CASH_OUT',
      amount: new Prisma.Decimal('15000.00'),
      reason: 'Beli plastik struk',
      createdById: cashierId,
      createdAt: new Date(),
      createdBy: { id: cashierId, name: 'Budi Kasir' },
    })

    const shiftWithMovement: ShiftWithRelations = {
      ...dummyShift,
      cashMovements: [
        {
          id: 'mov-1',
          shiftId: dummyShift.id,
          type: 'CASH_OUT',
          amount: new Prisma.Decimal('15000.00'),
          reason: 'Beli plastik struk',
          createdById: cashierId,
          createdAt: new Date(),
          createdBy: { id: cashierId, name: 'Budi Kasir' },
        },
      ],
    }
    vi.mocked(mockRepo.findById).mockResolvedValue(shiftWithMovement)

    const service = createShiftService(mockRepo)
    const result = await service.createCashMovement(cashierId, {
      type: 'CASH_OUT',
      amount: 15000,
      reason: 'Beli plastik struk',
    })

    expect(mockRepo.createCashMovement).toHaveBeenCalledWith({
      shiftId: dummyShift.id,
      type: 'CASH_OUT',
      amount: 15000,
      reason: 'Beli plastik struk',
      createdById: cashierId,
    })
    expect(result.cash_movements).toHaveLength(1)
    expect(result.cash_movements[0]?.amount).toBe('15000.00')
  })

  it('menolak mutasi kas bila tidak ada shift aktif', async () => {
    vi.mocked(mockRepo.findActiveByCashierId).mockResolvedValue(null)
    const service = createShiftService(mockRepo)

    await expect(
      service.createCashMovement(cashierId, {
        type: 'CASH_IN',
        amount: 50000,
        reason: 'Uang kembalian tambahan',
      }),
    ).rejects.toThrow(NotFoundError)
  })
})
