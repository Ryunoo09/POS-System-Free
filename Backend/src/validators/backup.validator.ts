import { z } from 'zod'
import { BACKUP_FILE_PATTERN } from '../utils/backup-file.js'

const filenameSchema = z
  .string()
  .regex(BACKUP_FILE_PATTERN, 'Nama file backup tidak valid')

export const backupFilenameParamSchema = z.object({ filename: filenameSchema })

export const restoreBackupSchema = z
  .object({
    filename: filenameSchema,
    password: z.string().min(1, 'Password wajib diisi').max(128, 'Password terlalu panjang'),
    confirmation: z.literal('RESTORE'),
  })
  .strict()

export type RestoreBackupInput = z.infer<typeof restoreBackupSchema>
