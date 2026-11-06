import { z } from 'zod'
import { DATE_PATTERN } from '../utils/date-range.js'
import { paginationSchema, uuidSchema } from './common.validator.js'

const dateSchema = z.string().regex(DATE_PATTERN, 'Format tanggal harus YYYY-MM-DD')

export const listInventoryQuerySchema = paginationSchema.extend({
  search: z.string().trim().min(1).optional(),
  category_id: uuidSchema.optional(),
})

export const listLowStockQuerySchema = paginationSchema

export const listMovementsQuerySchema = paginationSchema.extend({
  product_id: uuidSchema.optional(),
  movement_type: z
    .enum(['INITIAL_STOCK', 'PURCHASE', 'SALE', 'ADJUSTMENT', 'RETURN'])
    .optional(),
  start_date: dateSchema.optional(),
  end_date: dateSchema.optional(),
})

export const adjustStockSchema = z
  .object({
    product_id: uuidSchema,
    movement_type: z.enum(['PURCHASE', 'ADJUSTMENT']),
    quantity: z.number({ error: 'Jumlah wajib berupa angka' }).int('Harus bilangan bulat'),
    notes: z.string().trim().max(255, 'Catatan maksimal 255 karakter').optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.movement_type === 'PURCHASE' && value.quantity <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['quantity'],
        message: 'Jumlah pembelian harus lebih dari 0',
      })
    }

    if (value.movement_type === 'ADJUSTMENT') {
      if (value.quantity === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['quantity'],
          message: 'Jumlah penyesuaian tidak boleh 0',
        })
      }

      if (!value.notes) {
        ctx.addIssue({
          code: 'custom',
          path: ['notes'],
          message: 'Alasan wajib diisi untuk penyesuaian',
        })
      }
    }
  })

export type ListInventoryQuery = z.infer<typeof listInventoryQuerySchema>
export type ListLowStockQuery = z.infer<typeof listLowStockQuerySchema>
export type ListMovementsQuery = z.infer<typeof listMovementsQuerySchema>
export type AdjustStockInput = z.infer<typeof adjustStockSchema>