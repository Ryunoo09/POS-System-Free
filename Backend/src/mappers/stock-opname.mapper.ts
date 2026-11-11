import type { StockOpnameScope, StockOpnameStatus } from '../constants/opname.js'
import type {
  OpnameDetailView,
  OpnameItemView,
  OpnameListRow,
  OpnameSessionView,
} from '../repositories/stock-opname.repository.js'

export interface OpnameItemDto {
  id: string
  product_id: string
  sku: string
  barcode: string | null
  name: string
  system_stock: number
  physical_stock: number | null
  difference: number | null
  reason: string | null
  counted_by: { id: string; name: string } | null
  counted_at: string | null
}

export interface OpnameSessionDto {
  id: string
  session_number: string
  name: string
  status: StockOpnameStatus
  scope: StockOpnameScope
  notes: string | null
  rejection_reason: string | null
  created_by: { id: string; name: string }
  approved_by: { id: string; name: string } | null
  submitted_at: string | null
  approved_at: string | null
  rejected_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface OpnameListItemDto extends OpnameSessionDto {
  total_items: number
  counted_items: number
}

export interface OpnameSummaryDto {
  total_items: number
  counted_items: number
  uncounted_items: number
  positive_differences: number
  negative_differences: number
  zero_differences: number
  total_adjustment_quantity: number
}

export interface OpnameDetailDto extends OpnameSessionDto, OpnameSummaryDto {
  items: OpnameItemDto[]
}

const toSessionFields = (view: OpnameSessionView): OpnameSessionDto => ({
  id: view.id,
  session_number: view.sessionNumber,
  name: view.name,
  status: view.status,
  scope: view.scope,
  notes: view.notes,
  rejection_reason: view.rejectionReason,
  created_by: { id: view.createdBy.id, name: view.createdBy.name },
  approved_by: view.approvedBy ? { id: view.approvedBy.id, name: view.approvedBy.name } : null,
  submitted_at: view.submittedAt?.toISOString() ?? null,
  approved_at: view.approvedAt?.toISOString() ?? null,
  rejected_at: view.rejectedAt?.toISOString() ?? null,
  completed_at: view.completedAt?.toISOString() ?? null,
  created_at: view.createdAt.toISOString(),
  updated_at: view.updatedAt.toISOString(),
})

export const toOpnameItemDto = (view: OpnameItemView): OpnameItemDto => ({
  id: view.id,
  product_id: view.productId,
  sku: view.skuSnapshot,
  barcode: view.barcodeSnapshot,
  name: view.nameSnapshot,
  system_stock: view.systemStock,
  physical_stock: view.physicalStock,
  difference: view.difference,
  reason: view.reason,
  counted_by: view.countedBy ? { id: view.countedBy.id, name: view.countedBy.name } : null,
  counted_at: view.countedAt?.toISOString() ?? null,
})

export const toOpnameListItemDto = (view: OpnameListRow): OpnameListItemDto => ({
  ...toSessionFields(view),
  total_items: view.totalItems,
  counted_items: view.countedItems,
})

export const summarizeOpname = (items: OpnameItemView[]): OpnameSummaryDto => {
  const summary: OpnameSummaryDto = {
    total_items: items.length,
    counted_items: 0,
    uncounted_items: 0,
    positive_differences: 0,
    negative_differences: 0,
    zero_differences: 0,
    total_adjustment_quantity: 0,
  }

  for (const item of items) {
    if (item.physicalStock === null || item.difference === null) {
      summary.uncounted_items += 1
      continue
    }

    summary.counted_items += 1
    summary.total_adjustment_quantity += item.difference

    if (item.difference > 0) summary.positive_differences += 1
    else if (item.difference < 0) summary.negative_differences += 1
    else summary.zero_differences += 1
  }

  return summary
}

export const toOpnameDetailDto = (view: OpnameDetailView): OpnameDetailDto => ({
  ...toSessionFields(view),
  ...summarizeOpname(view.items),
  items: view.items.map(toOpnameItemDto),
})