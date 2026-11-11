import { z } from 'zod'
import { uuidSchema } from './common.validator.js'

const MAX_AMOUNT = 9_999_999_999.99

const priceAmount = z
  .number({ error: 'Harus berupa angka' })
  .min(0, 'Tidak boleh negatif')
  .max(MAX_AMOUNT, 'Melebihi batas maksimum')
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, {
    message: 'Maksimum 2 digit desimal',
  })

const reasonSchema = z
  .string()
  .trim()
  .min(3, 'Alasan minimal 3 karakter')
  .max(255, 'Alasan maksimal 255 karakter')

const effectiveDateSchema = z
  .coerce.date({ error: 'Tanggal tidak valid' })
  .refine((value) => Number.isFinite(value.getTime()), 'Tanggal tidak valid')

export const schedulePriceSchema = z
  .object({
    selling_price: priceAmount,
    effective_date: effectiveDateSchema,
    reason: reasonSchema,
  })
  .strict()

export const scheduleIdParamSchema = z.object({
  id: uuidSchema,
  scheduleId: uuidSchema,
})

export type SchedulePriceInput = z.infer<typeof schedulePriceSchema>

const bulkPriceBase = z
  .object({
    mode: z.enum(['SET', 'PERCENT', 'NOMINAL']),
    value: z.number({ error: 'Harus berupa angka' }).finite('Harus berupa angka'),
    product_ids: z.array(uuidSchema).min(1, 'Pilih minimal satu produk').max(500).optional(),
    category_id: uuidSchema.optional(),
  })
  .strict()

type BulkPriceBase = z.infer<typeof bulkPriceBase>

const refineBulkPrice = (data: BulkPriceBase, ctx: z.RefinementCtx): void => {
  if (Boolean(data.product_ids) === Boolean(data.category_id)) {
    ctx.addIssue({
      code: 'custom',
      path: ['product_ids'],
      message: 'Pilih salah satu: product_ids atau category_id',
    })
  }

  if (data.mode === 'PERCENT' && (data.value <= -100 || data.value > 1000)) {
    ctx.addIssue({
      code: 'custom',
      path: ['value'],
      message: 'Persentase harus lebih dari -100 dan maksimal 1000',
    })
  }

  if (data.mode === 'SET' && data.value < 0) {
    ctx.addIssue({ code: 'custom', path: ['value'], message: 'Harga tidak boleh negatif' })
  }

  if (
    data.mode !== 'PERCENT' &&
    Math.abs(data.value * 100 - Math.round(data.value * 100)) > 1e-6
  ) {
    ctx.addIssue({ code: 'custom', path: ['value'], message: 'Maksimum 2 digit desimal' })
  }
}

export const bulkPricePreviewSchema = bulkPriceBase.superRefine(refineBulkPrice)

export const bulkPriceApplySchema = bulkPriceBase
  .extend({ reason: reasonSchema })
  .superRefine(refineBulkPrice)

export type BulkPricePreviewInput = z.infer<typeof bulkPricePreviewSchema>
export type BulkPriceApplyInput = z.infer<typeof bulkPriceApplySchema>