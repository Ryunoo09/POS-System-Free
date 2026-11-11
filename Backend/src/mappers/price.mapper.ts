import type { PriceHistoryView } from '../repositories/price.repository.js'
import type { ScheduledPriceChange } from '@prisma/client'

export interface PriceHistoryDto {
  id: string
  field: 'SELLING_PRICE' | 'COST_PRICE'
  old_value: string
  new_value: string
  source: string
  reason: string | null
  changed_by: { id: string; name: string } | null
  created_at: string
}

export interface ScheduledPriceDto {
  id: string
  selling_price: string
  effective_date: string
  status: string
  reason: string
  applied_at: string | null
  created_at: string
}

export const toPriceHistoryDto = (row: PriceHistoryView): PriceHistoryDto => ({
  id: row.id,
  field: row.field,
  old_value: row.oldValue.toFixed(2),
  new_value: row.newValue.toFixed(2),
  source: row.source,
  reason: row.reason,
  changed_by: row.changedBy,
  created_at: row.createdAt.toISOString(),
})

export const toScheduledPriceDto = (row: ScheduledPriceChange): ScheduledPriceDto => ({
  id: row.id,
  selling_price: row.sellingPrice.toFixed(2),
  effective_date: row.effectiveDate.toISOString(),
  status: row.status,
  reason: row.reason,
  applied_at: row.appliedAt?.toISOString() ?? null,
  created_at: row.createdAt.toISOString(),
})