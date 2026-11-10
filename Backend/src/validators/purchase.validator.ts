import { z } from 'zod'
import { PURCHASE_ORDER_STATUSES, type PurchaseOrderStatus } from '../constants/purchasing.js'
import { paginationSchema, uuidSchema } from './common.validator.js'

const statusValues = Object.values(PURCHASE_ORDER_STATUSES) as [
  PurchaseOrderStatus,
  ...PurchaseOrderStatus[],
]

const createPurchaseOrderItemSchema = z
  .object({
    product_id: uuidSchema,
    quantity: z.number().int().min(1, 'Kuantitas minimal 1'),
    cost_price: z.number().min(0, 'Harga beli tidak boleh negatif'),
  })
  .strict()

export const createPurchaseOrderSchema = z
  .object({
    supplier_id: uuidSchema,
    notes: z.string().trim().max(500, 'Catatan maksimal 500 karakter').optional(),
    items: z.array(createPurchaseOrderItemSchema).min(1, 'Minimal satu item pembelian'),
  })
  .strict()
  .superRefine((value, ctx) => {
    const seen = new Set<string>()

    value.items.forEach((item, index) => {
      if (seen.has(item.product_id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['items', index, 'product_id'],
          message: 'Produk duplikat dalam satu purchase order',
        })
      }
      seen.add(item.product_id)
    })
  })

export const purchaseOrderIdParamSchema = z.object({ id: uuidSchema })

export const listPurchaseOrdersQuerySchema = paginationSchema.extend({
  status: z.enum(statusValues).optional(),
  supplier_id: uuidSchema.optional(),
  search: z.string().trim().min(1).optional(),
})

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>
export type ListPurchaseOrdersQuery = z.infer<typeof listPurchaseOrdersQuerySchema>