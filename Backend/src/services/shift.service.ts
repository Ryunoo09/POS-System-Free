import { ConflictError, NotFoundError } from '../errors/app-errors.js'
import type { ShiftRepository } from '../repositories/shift.repository.js'
import { toShiftDto, type ShiftDto } from '../mappers/shift.mapper.js'
import type { OpenShiftInput, CloseShiftInput, CashMovementInput } from '../validators/shift.validator.js'

export interface ShiftSummaryDto {
  starting_cash: string
  cash_sales: string
  non_cash_sales: string
  total_sales: string
  cash_in: string
  cash_out: string
  expected_cash: string
  payment_breakdown: Array<{
    payment_method: string
    transaction_count: number
    revenue: string
  }>
}

export interface ShiftService {
  getCurrentShift(cashierId: string): Promise<ShiftDto | null>
  openShift(cashierId: string, input: OpenShiftInput): Promise<ShiftDto>
  closeShift(cashierId: string, input: CloseShiftInput): Promise<ShiftDto>
  createCashMovement(cashierId: string, input: CashMovementInput): Promise<ShiftDto>
  getCurrentShiftSummary(cashierId: string): Promise<ShiftSummaryDto>
  getHistory(params: {
    cashierId?: string | undefined
    status?: 'OPEN' | 'CLOSED' | undefined
    page?: number | undefined
    limit?: number | undefined
  }): Promise<{ items: ShiftDto[]; total: number }>
}

export const createShiftService = (shiftRepository: ShiftRepository): ShiftService => ({
  async getCurrentShift(cashierId: string) {
    const shift = await shiftRepository.findActiveByCashierId(cashierId)
    return shift ? toShiftDto(shift) : null
  },

  async openShift(cashierId: string, input: OpenShiftInput) {
    const existing = await shiftRepository.findActiveByCashierId(cashierId)
    if (existing) {
      throw new ConflictError('Kasir sudah memiliki shift yang sedang aktif')
    }

    const created = await shiftRepository.create({
      cashierId,
      startingCash: input.starting_cash,
    })
    return toShiftDto(created)
  },

  async closeShift(cashierId: string, input: CloseShiftInput) {
    const current = await shiftRepository.findActiveByCashierId(cashierId)
    if (!current) {
      throw new NotFoundError('Tidak ada shift aktif yang ditemukan untuk kasir ini')
    }

    const summary = await shiftRepository.calculateShiftCashSummary(current.id)
    const expectedCash = summary.expectedCash
    const actualCash = input.actual_cash
    const cashDifference = actualCash - expectedCash

    const closed = await shiftRepository.close(current.id, {
      expectedCash,
      actualCash,
      cashDifference,
      differenceNote: input.difference_note,
      closedAt: new Date(),
    })

    return toShiftDto(closed)
  },

  async createCashMovement(cashierId: string, input: CashMovementInput) {
    const current = await shiftRepository.findActiveByCashierId(cashierId)
    if (!current) {
      throw new NotFoundError('Tidak ada shift aktif untuk mencatat mutasi kas')
    }

    await shiftRepository.createCashMovement({
      shiftId: current.id,
      type: input.type,
      amount: input.amount,
      reason: input.reason,
      createdById: cashierId,
    })

    const updated = await shiftRepository.findById(current.id)
    if (!updated) {
      throw new NotFoundError('Shift tidak ditemukan')
    }
    return toShiftDto(updated)
  },

  async getCurrentShiftSummary(cashierId: string) {
    const current = await shiftRepository.findActiveByCashierId(cashierId)
    if (!current) {
      throw new NotFoundError('Tidak ada shift aktif untuk kasir ini')
    }

    const summary = await shiftRepository.calculateShiftCashSummary(current.id)
    return {
      starting_cash: summary.startingCash.toFixed(2),
      cash_sales: summary.cashSales.toFixed(2),
      non_cash_sales: summary.nonCashSales.toFixed(2),
      total_sales: summary.totalSales.toFixed(2),
      cash_in: summary.cashIn.toFixed(2),
      cash_out: summary.cashOut.toFixed(2),
      expected_cash: summary.expectedCash.toFixed(2),
      payment_breakdown: summary.paymentBreakdown.map((row) => ({
        payment_method: row.paymentMethod,
        transaction_count: row.transactionCount,
        revenue: row.revenue.toFixed(2),
      })),
    }
  },

  async getHistory(params) {
    const { items, total } = await shiftRepository.findHistory(params)
    return {
      items: items.map(toShiftDto),
      total,
    }
  },
})
