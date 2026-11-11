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