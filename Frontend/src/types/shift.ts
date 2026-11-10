import type { PaymentMethod } from './transaction'

export type ShiftStatus = 'OPEN' | 'CLOSED'
export type CashMovementType = 'CASH_IN' | 'CASH_OUT'

export interface CashMovement {
  id: string
  shift_id: string
  type: CashMovementType
  amount: string
  reason: string
  created_by: { id: string; name: string }
  created_at: string
}

export interface Shift {
  id: string
  cashier: { id: string; name: string }
  status: ShiftStatus
  starting_cash: string
  expected_cash: string | null
  actual_cash: string | null
  cash_difference: string | null
  difference_note: string | null
  transaction_count?: number
  total_sales: string | null
  non_cash_sales: string | null
  cash_movements: CashMovement[]
  opened_at: string
  closed_at: string | null
}

export interface ShiftPaymentBreakdown {
  payment_method: PaymentMethod
  transaction_count: number
  revenue: string
}

export interface ShiftSummary {
  starting_cash: string
  cash_sales: string
  non_cash_sales: string
  total_sales: string
  cash_in: string
  cash_out: string
  expected_cash: string
  payment_breakdown: ShiftPaymentBreakdown[]
}

export interface OpenShiftPayload {
  starting_cash: number
}

export interface CloseShiftPayload {
  actual_cash: number
  difference_note?: string
}

export interface CashMovementPayload {
  type: CashMovementType
  amount: number
  reason: string
}

export interface ShiftHistoryParams {
  cashier_id?: string
  status?: ShiftStatus
  page?: number
  limit?: number
}
