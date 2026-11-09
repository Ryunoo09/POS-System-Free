import { z } from 'zod'
import { PAYMENT_METHODS } from '../constants/transactions.js'
import {
  RETURN_ACTIONS,
  RETURN_STATUSES,
  type ReturnAction,
  type ReturnStatus,
} from '../constants/returns.js'
import { DATE_PATTERN } from '../utils/date-range.js'
import { paginationSchema, uuidSchema } from './common.validator.js'

const dateSchema = z.string().regex(DATE_PATTERN, 'Format tanggal harus YYYY-MM-DD')

const actionValues = Object.values(RETURN_ACTIONS) as [ReturnAction, ...ReturnAction[]]
const statusValues = Object.values(RETURN_STATUSES) as [ReturnStatus, ...ReturnStatus[]]

const returnItemSchema = z
  .object({
    transaction_item_id: uuidSchema,
    quantity: z.number().int().min(1, 'Kuantitas retur minimal 1'),
    action: z.enum(actionValues).default(RETURN_ACTIONS.RESTOCK),
  })
  .strict()

export const createReturnSchema = z
  .object({
    transaction_id: uuidSchema,
    reason: z
      .string()
      .trim()
      .min(3, 'Alasan retur minimal 3 karakter')
      .max(255, 'Alasan retur maksimal 255 karakter'),
    refund_method: z.enum([
      PAYMENT_METHODS.CASH,
      PAYMENT_METHODS.QRIS,
      PAYMENT_METHODS.DEBIT_CARD,
      PAYMENT_METHODS.BANK_TRANSFER,
    ]),
    items: z.array(returnItemSchema).min(1, 'Minimal satu item diretur'),
  })
  .strict()
  .superRefine((value, ctx) => {
    const seen = new Set<string>()

    value.items.forEach((item, index) => {
      if (seen.has(item.transaction_item_id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['items', index, 'transaction_item_id'],
          message: 'Item transaksi duplikat dalam satu retur',
        })
      }
      seen.add(item.transaction_item_id)
    })
  })

export const returnIdParamSchema = z.object({ id: uuidSchema })

export const listReturnsQuerySchema = paginationSchema.extend({
  transaction_id: uuidSchema.optional(),
  cashier_id: uuidSchema.optional(),
  status: z.enum(statusValues).optional(),
  start_date: dateSchema.optional(),
  end_date: dateSchema.optional(),
})

export type ListReturnsQuery = z.infer<typeof listReturnsQuerySchema>
export type CreateReturnInput = z.infer<typeof createReturnSchema>