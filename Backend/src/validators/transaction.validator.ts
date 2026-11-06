import { z } from 'zod'
import { DATE_PATTERN } from '../utils/date-range.js'
import { paginationSchema } from './common.validator.js'

const dateSchema = z.string().regex(DATE_PATTERN, 'Format tanggal harus YYYY-MM-DD')

export const listTransactionsQuerySchema = paginationSchema.extend({
  status: z.enum(['COMPLETED', 'CANCELLED']).optional(),
  start_date: dateSchema.optional(),
  end_date: dateSchema.optional(),
})

export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>