import { z } from 'zod'
import { PAYMENT_METHODS } from '../constants/transactions.js'
import { DATE_PATTERN } from '../utils/date-range.js'
import { paginationSchema, uuidSchema } from './common.validator.js'

const dateSchema = z.string().regex(DATE_PATTERN, 'Format tanggal harus YYYY-MM-DD')

export const listTransactionsQuerySchema = paginationSchema.extend({
  status: z.enum(['COMPLETED', 'CANCELLED']).optional(),
  start_date: dateSchema.optional(),
  end_date: dateSchema.optional(),
})

const hasAtMostTwoDecimals = (value: number): boolean =>
  Math.abs(value * 100 - Math.round(value * 100)) < 1e-6

const checkoutItemSchema = z
  .object({
    product_id: uuidSchema,
    quantity: z
      .number({ error: 'Quantity wajib berupa angka' })
      .int('Quantity harus bilangan bulat')
      .positive('Quantity harus lebih dari 0'),
    discount_amount: z
      .number()
      .min(0, 'Diskon item tidak boleh negatif')
      .refine(hasAtMostTwoDecimals, 'Diskon item maksimal 2 desimal')
      .optional(),
  })
  .strict()

const checkoutPaymentSchema = z
  .object({
    method: z.enum(
      [PAYMENT_METHODS.CASH, PAYMENT_METHODS.QRIS, PAYMENT_METHODS.DEBIT_CARD, PAYMENT_METHODS.BANK_TRANSFER],
      { error: 'Metode pembayaran tidak valid' },
    ),
    amount_paid: z
      .number({ error: 'Jumlah bayar wajib berupa angka' })
      .min(0, 'Jumlah bayar tidak boleh negatif')
      .refine(hasAtMostTwoDecimals, 'Jumlah bayar maksimal 2 desimal'),
    reference: z.string().trim().max(100, 'Referensi maksimal 100 karakter').optional(),
  })
  .strict()

export const checkoutSchema = z
  .object({
    items: z
      .array(checkoutItemSchema, { error: 'Items wajib berupa array' })
      .min(1, 'Minimal 1 item')
      .max(100, 'Maksimal 100 item'),
    discount_amount: z
      .number()
      .min(0, 'Diskon tidak boleh negatif')
      .refine(hasAtMostTwoDecimals, 'Diskon maksimal 2 desimal')
      .optional()
      .default(0),
    payment: checkoutPaymentSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    const seen = new Set<string>()

    value.items.forEach((item, index) => {
      if (seen.has(item.product_id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['items', index, 'product_id'],
          message: 'Produk tidak boleh duplikat',
        })
      }

      seen.add(item.product_id)
    })
  })

export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>
export type CheckoutInput = z.infer<typeof checkoutSchema>
