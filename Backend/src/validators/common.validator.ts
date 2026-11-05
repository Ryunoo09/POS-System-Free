import { z } from 'zod'

export const uuidSchema = z.uuid()

export const booleanQuerySchema = z.enum(['true', 'false']).transform((value) => value === 'true')

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
})

export const dateRangeSchema = z
  .object({
    start_date: z.coerce.date(),
    end_date: z.coerce.date(),
  })
  .refine((value) => value.start_date <= value.end_date, {
    message: 'start_date tidak boleh melebihi end_date',
    path: ['end_date'],
  })
