import { z } from 'zod'
import { DATE_PATTERN } from '../utils/date-range.js'

const dateSchema = z.string().regex(DATE_PATTERN, 'Format tanggal harus YYYY-MM-DD')

export const dashboardQuerySchema = z.object({
  start_date: dateSchema.optional(),
  end_date: dateSchema.optional(),
})

export const topProductsQuerySchema = dashboardQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(20).default(5),
})

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>
export type TopProductsQuery = z.infer<typeof topProductsQuerySchema>