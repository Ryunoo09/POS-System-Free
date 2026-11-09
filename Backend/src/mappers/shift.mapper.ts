import type { ShiftWithRelations } from '../repositories/shift.repository.js'

export interface CashMovementDto {
  id: string
  shift_id: string
  type: 'CASH_IN' | 'CASH_OUT'
  amount: string
  reason: string
  created_by: { id: string; name: string }
  created_at: string
}

export interface ShiftDto {
  id: string
  cashier: { id: string; name: string }
  status: 'OPEN' | 'CLOSED'
  starting_cash: string
  expected_cash: string | null
  actual_cash: string | null
  cash_difference: string | null
  difference_note: string | null
  transaction_count?: number | undefined
  cash_movements: CashMovementDto[]
  opened_at: string
  closed_at: string | null
}

export const toShiftDto = (shift: ShiftWithRelations): ShiftDto => ({
  id: shift.id,
  cashier: { id: shift.cashier.id, name: shift.cashier.name },
  status: shift.status,
  starting_cash: shift.startingCash.toFixed(2),
  expected_cash: shift.expectedCash ? shift.expectedCash.toFixed(2) : null,
  actual_cash: shift.actualCash ? shift.actualCash.toFixed(2) : null,
  cash_difference: shift.cashDifference ? shift.cashDifference.toFixed(2) : null,
  difference_note: shift.differenceNote,
  transaction_count: shift._count?.transactions,
  cash_movements: shift.cashMovements.map((m) => ({
    id: m.id,
    shift_id: m.shiftId,
    type: m.type,
    amount: m.amount.toFixed(2),
    reason: m.reason,
    created_by: { id: m.createdBy.id, name: m.createdBy.name },
    created_at: m.createdAt.toISOString(),
  })),
  opened_at: shift.openedAt.toISOString(),
  closed_at: shift.closedAt ? shift.closedAt.toISOString() : null,
})
