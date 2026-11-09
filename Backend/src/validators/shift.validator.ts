import { z } from 'zod'

export const openShiftSchema = z.object({
  starting_cash: z
    .number({ message: 'Modal awal harus berupa angka' })
    .min(0, { message: 'Modal awal tidak boleh negatif' })
    .max(100_000_000, { message: 'Modal awal maksimal Rp 100.000.000' }),
})

export type OpenShiftInput = z.infer<typeof openShiftSchema>

export const closeShiftSchema = z.object({
  actual_cash: z
    .number({ message: 'Uang fisik aktual harus berupa angka' })
    .min(0, { message: 'Uang fisik tidak boleh negatif' }),
  difference_note: z
    .string()
    .trim()
    .max(255, { message: 'Catatan selisih maksimal 255 karakter' })
    .optional(),
})

export type CloseShiftInput = z.infer<typeof closeShiftSchema>

export const cashMovementSchema = z.object({
  type: z.enum(['CASH_IN', 'CASH_OUT'], { message: 'Tipe mutasi kas harus CASH_IN atau CASH_OUT' }),
  amount: z
    .number({ message: 'Jumlah kas harus berupa angka' })
    .positive({ message: 'Jumlah kas harus lebih besar dari 0' })
    .max(100_000_000, { message: 'Jumlah kas maksimal Rp 100.000.000' }),
  reason: z
    .string({ message: 'Alasan mutasi kas harus diisi' })
    .trim()
    .min(3, { message: 'Alasan mutasi kas minimal 3 karakter' })
    .max(255, { message: 'Alasan mutasi kas maksimal 255 karakter' }),
})

export type CashMovementInput = z.infer<typeof cashMovementSchema>
