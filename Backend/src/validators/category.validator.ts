import { z } from 'zod'
import { booleanQuerySchema, paginationSchema, uuidSchema } from './common.validator.js'

const nameSchema = z.string().trim().min(1, 'Nama wajib diisi').max(100, 'Nama maksimal 100 karakter')
const descriptionSchema = z.string().trim().max(500, 'Deskripsi maksimal 500 karakter')

export const listCategoriesQuerySchema = paginationSchema.extend({
  search: z.string().trim().min(1).optional(),
  is_active: booleanQuerySchema.optional(),
})

export const categoryIdParamSchema = z.object({ id: uuidSchema })

export const createCategorySchema = z
  .object({
    name: nameSchema,
    description: descriptionSchema.optional(),
  })
  .strict()

export const updateCategorySchema = z
  .object({
    name: nameSchema.optional(),
    description: descriptionSchema.optional(),
    is_active: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Minimal satu field harus diisi',
  })

export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>
export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
