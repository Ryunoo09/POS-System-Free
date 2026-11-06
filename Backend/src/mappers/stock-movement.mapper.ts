import type { StockMovementView } from '../repositories/stock-movement.repository.js'
import type { StockMovementType, StockReferenceType } from '../constants/stock.js'

export interface StockMovementDto {
  id: string
  product: { id: string; sku: string; name: string }
  movement_type: StockMovementType
  quantity: number
  stock_before: number
  stock_after: number
  reference_type: StockReferenceType
  reference_id: string | null
  invoice_number: string | null
  notes: string | null
  created_by: { id: string; name: string }
  created_at: string
}

export const toStockMovementDto = (movement: StockMovementView): StockMovementDto => ({
  id: movement.id,
  product: {
    id: movement.product.id,
    sku: movement.product.sku,
    name: movement.product.name,
  },
  movement_type: movement.movementType,
  quantity: movement.quantity,
  stock_before: movement.stockBefore,
  stock_after: movement.stockAfter,
  reference_type: movement.referenceType,
  reference_id: movement.referenceId,
  invoice_number: movement.invoiceNumber,
  notes: movement.notes,
  created_by: { id: movement.createdBy.id, name: movement.createdBy.name },
  created_at: movement.createdAt.toISOString(),
})