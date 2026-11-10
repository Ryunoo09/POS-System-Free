import { z } from 'zod'
import { booleanQuerySchema, paginationSchema, uuidSchema } from './common.validator.js'

const nameSchema = z
  .string()
  .trim()
  .min(1, 'Nama supplier wajib diisi')
  .max(150, 'Nama supplier maksimal 150 karakter')
const contactSchema = z.string().trim().max(100, 'Kontak maksimal 100 karakter')
const phoneSchema = z.string().trim().max(30, 'Telepon maksimal 30 karakter')
const emailSchema = z.email('Format email tidak valid').max(100, 'Email maksimal 100 karakter')
const addressSchema = z.string().trim().max(255, 'Alamat maksimal 255 karakter')

export const listSuppliersQuerySchema = paginationSchema.extend({
  search: z.string().trim().min(1).optional(),
  is_active: booleanQuerySchema.optional(),
})

export const supplierIdParamSchema = z.object({ id: uuidSchema })

export const createSupplierSchema = z
  .object({
    name: nameSchema,
    contact: contactSchema.optional(),
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    address: addressSchema.optional(),
  })
  .strict()

export const updateSupplierSchema = z
  .object({
    name: nameSchema.optional(),
    contact: contactSchema.optional(),
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    address: addressSchema.optional(),
    is_active: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Minimal satu field harus diisi',
  })

export type ListSuppliersQuery = z.infer<typeof listSuppliersQuerySchema>
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>