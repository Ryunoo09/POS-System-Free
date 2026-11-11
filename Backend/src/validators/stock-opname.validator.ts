import { z } from 'zod'
import {
  MAX_OPNAME_ITEMS,
  STOCK_OPNAME_SCOPES,
  STOCK_OPNAME_STATUSES,
  type StockOpnameScope,
  type StockOpnameStatus,
} from '../constants/opname.js'
import { DATE_PATTERN } from '../utils/date-range.js'
import { paginationSchema, uuidSchema } from './common.validator.js'

const dateSchema = z.string().regex(DATE_PATTERN, 'Format tanggal harus YYYY-MM-DD')

const statusValues = Object.values(STOCK_OPNAME_STATUSES) as [
  StockOpnameStatus,
  ...StockOpnameStatus[],
]

const scopeValues = Object.values(STOCK_OPNAME_SCOPES) as [
  StockOpnameScope,
  ...StockOpnameScope[],
]

export const listStockOpnamesQuerySchema = paginationSchema.extend({
  status: z.enum(statusValues).optional(),
  scope: z.enum(scopeValues).optional(),
  created_by: uuidSchema.optional(),
  start_date: dateSchema.optional(),
  end_date: dateSchema.optional(),
})

export const createStockOpnameSchema = z
  .object({
    name: z
      .string({ error: 'Nama sesi wajib diisi' })
      .trim()
      .min(1, 'Nama sesi wajib diisi')
      .max(150, 'Nama sesi maksimal 150 karakter'),
    scope: z.enum(scopeValues, { error: 'Cakupan opname tidak valid' }),
    category_ids: z
      .array(uuidSchema)
      .max(200, 'Maksimal 200 kategori per sesi')
      .optional(),
    product_ids: z
      .array(uuidSchema)
      .max(MAX_OPNAME_ITEMS, `Maksimal ${MAX_OPNAME_ITEMS} produk per sesi`)
      .optional(),
    notes: z.string().trim().max(500, 'Catatan maksimal 500 karakter').optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.scope === 'CATEGORY') {
      if (!value.category_ids || value.category_ids.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['category_ids'],
          message: 'Pilih minimal satu kategori',
        })
      }

      if (value.product_ids && value.product_ids.length > 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['product_ids'],
          message: 'Scope CATEGORY tidak boleh mengirim product_ids',
        })
      }
    }

    if (value.scope === 'PRODUCT') {
      if (!value.product_ids || value.product_ids.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['product_ids'],
          message: 'Pilih minimal satu produk',
        })
      }

      if (value.category_ids && value.category_ids.length > 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['category_ids'],
          message: 'Scope PRODUCT tidak boleh mengirim category_ids',
        })
      }
    }

    if (value.scope === 'ALL') {
      if ((value.category_ids && value.category_ids.length > 0) || (value.product_ids && value.product_ids.length > 0)) {
        ctx.addIssue({
          code: 'custom',
          path: ['scope'],
          message: 'Scope ALL tidak boleh mengirim category_ids atau product_ids',
        })
      }
    }
  })

export const stockOpnameIdParamSchema = z.object({ id: uuidSchema })

export const opnameItemParamSchema = z.object({ id: uuidSchema, itemId: uuidSchema })

export const updateStockOpnameItemSchema = z
  .object({
    physical_stock: z
      .number({ error: 'Stok fisik wajib berupa angka' })
      .int('Stok fisik harus bilangan bulat')
      .min(0, 'Stok fisik tidak boleh negatif'),
    reason: z.string().trim().max(255, 'Alasan maksimal 255 karakter').optional(),
  })
  .strict()

export type ListStockOpnamesQuery = z.infer<typeof listStockOpnamesQuerySchema>
export type CreateStockOpnameInput = z.infer<typeof createStockOpnameSchema>
export type UpdateStockOpnameItemInput = z.infer<typeof updateStockOpnameItemSchema>

export const rejectStockOpnameSchema = z
  .object({
    reason: z
      .string({ error: 'Alasan penolakan wajib diisi' })
      .trim()
      .min(3, 'Alasan penolakan minimal 3 karakter')
      .max(500, 'Alasan penolakan maksimal 500 karakter'),
  })
  .strict()

export type RejectStockOpnameInput = z.infer<typeof rejectStockOpnameSchema>