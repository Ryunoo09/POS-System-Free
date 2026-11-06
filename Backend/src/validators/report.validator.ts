import { z } from 'zod'
import { DATE_PATTERN } from '../utils/date-range.js'
import { paginationSchema } from './common.validator.js'

const dateSchema = z.string().regex(DATE_PATTERN, 'Format tanggal harus YYYY-MM-DD')

const reportRangeSchema = z.object({
  start_date: dateSchema,
  end_date: dateSchema,
})

export const salesReportQuerySchema = reportRangeSchema.extend({
  group_by: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
})

export const productReportQuerySchema = reportRangeSchema
  .extend({
    category_id: z.uuid().optional(),
    sort: z.enum(['best_selling', 'revenue', 'profit']).default('best_selling'),
  })
  .extend(paginationSchema.shape)

export const cashierReportQuerySchema = reportRangeSchema

export type SalesReportQuery = z.infer<typeof salesReportQuerySchema>
export type ProductReportQuery = z.infer<typeof productReportQuerySchema>
export type CashierReportQuery = z.infer<typeof cashierReportQuerySchema>
