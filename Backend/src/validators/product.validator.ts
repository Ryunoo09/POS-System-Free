import { z } from 'zod'
import { booleanQuerySchema, paginationSchema, uuidSchema } from './common.validator.js'

const MAX_AMOUNT = 9_999_999_999.99

const decimalAmount = z
  .number({ error: 'Harus berupa angka' })
  .min(0, 'Tidak boleh negatif')
  .max(MAX_AMOUNT, 'Melebihi batas maksimum')
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, {
    message: 'Maksimum 2 digit desimal',
  })

const nonNegativeInt = z.coerce.number().int('Harus bilangan bulat').min(0, 'Tidak boleh negatif')

const skuSchema = z
  .string()
  .trim()
  .min(3, 'SKU minimal 3 karakter')
  .max(50, 'SKU maksimal 50 karakter')
  .regex(/^[A-Za-z0-9-]+$/, 'SKU hanya boleh huruf, angka, atau tanda hubung')
  .transform((value) => value.toUpperCase())

const barcodeSchema = z
  .string()
  .trim()
  .regex(/^\d{8,50}$/, 'Barcode harus 8–50 digit angka')

const nameSchema = z.string().trim().min(1, 'Nama wajib diisi').max(150, 'Nama maksimal 150 karakter')
const unitSchema = z.string().trim().min(1, 'Satuan wajib diisi').max(20, 'Satuan maksimal 20 karakter')

export const listProductsQuerySchema = paginationSchema.extend({
  search: z.string().trim().min(1).optional(),
  barcode: z.string().trim().min(1).optional(),
  category_id: uuidSchema.optional(),
  is_active: booleanQuerySchema.optional(),
})

export const productIdParamSchema = z.object({ id: uuidSchema })

export const createProductSchema = z
  .object({
    sku: skuSchema,
    barcode: barcodeSchema.optional(),
    name: nameSchema,
    description: z.string().trim().max(2000).optional(),
    category_id: uuidSchema,
    unit: unitSchema,
    cost_price: decimalAmount,
    selling_price: decimalAmount,
    stock: nonNegativeInt,
    min_stock: nonNegativeInt,
  })
  .strict()

export const updateProductSchema = z
  .object({
    sku: skuSchema.optional(),
    barcode: barcodeSchema.optional(),
    name: nameSchema.optional(),
    description: z.string().trim().max(2000).optional(),
    category_id: uuidSchema.optional(),
    unit: unitSchema.optional(),
    cost_price: decimalAmount.optional(),
    selling_price: decimalAmount.optional(),
    min_stock: nonNegativeInt.optional(),
    is_active: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Minimal satu field harus diisi',
  })

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>
export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
