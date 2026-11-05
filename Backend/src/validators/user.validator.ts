import { z } from 'zod'
import { booleanQuerySchema, paginationSchema, uuidSchema } from './common.validator.js'

const ROLES = ['ADMIN', 'OWNER', 'CASHIER'] as const

const passwordSchema = z
  .string()
  .min(8, 'Password minimal 8 karakter')
  .max(72, 'Password maksimal 72 karakter')
  .regex(/[a-z]/, 'Password harus memuat huruf kecil')
  .regex(/[A-Z]/, 'Password harus memuat huruf besar')
  .regex(/\d/, 'Password harus memuat angka')

const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(255))

const nameSchema = z.string().trim().min(1, 'Nama wajib diisi').max(100, 'Nama maksimal 100 karakter')

export const listUsersQuerySchema = paginationSchema.extend({
  search: z.string().trim().min(1).optional(),
  role: z.enum(ROLES).optional(),
  is_active: booleanQuerySchema.optional(),
})

export const userIdParamSchema = z.object({ id: uuidSchema })

export const createUserSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    role: z.enum(ROLES),
  })
  .strict()
  .refine((value) => value.password !== value.email, {
    path: ['password'],
    message: 'Password tidak boleh sama dengan email',
  })

export const updateUserSchema = z
  .object({
    name: nameSchema.optional(),
    role: z.enum(ROLES).optional(),
    is_active: z.boolean().optional(),
    password: passwordSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Minimal satu field harus diisi',
  })

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
