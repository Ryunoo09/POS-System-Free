import { z } from 'zod'

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email().max(255)),
    password: z.string().min(1).max(72),
  })
  .strict()

export type LoginInput = z.infer<typeof loginSchema>
