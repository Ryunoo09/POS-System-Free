import type { Request, RequestHandler } from 'express'
import type { BackupActor, BackupService } from '../services/backup.service.js'
import type { AuthUser } from '../types/auth.js'
import { auditContextFrom, requireActor } from '../utils/request.js'
import { sendSuccess } from '../utils/response.js'
import type { RestoreBackupInput } from '../validators/backup.validator.js'

export interface BackupController {
  list: RequestHandler
  create: RequestHandler
  download: RequestHandler
  restore: RequestHandler
}

const toActor = (user: AuthUser, req: Request): BackupActor => ({
  id: user.id,
  ...auditContextFrom(req),
})

export const createBackupController = ({
  backupService,
}: {
  backupService: BackupService
}): BackupController => ({
  list: async (_req, res) => {
    const data = await backupService.list()

    return sendSuccess(res, { data })
  },

  create: async (req, res) => {
    const actor = toActor(requireActor(req), req)
    const data = await backupService.create(actor)

    return sendSuccess(res, { statusCode: 201, message: 'Backup berhasil dibuat', data })
  },

  download: async (req, res) => {
    const { filename } = req.validated?.params as { filename: string }
    const file = await backupService.getDownloadPath(filename)

    return res.download(file.path, file.filename)
  },

  restore: async (req, res) => {
    const input = req.validated?.body as RestoreBackupInput
    const actor = toActor(requireActor(req), req)

    await backupService.restore(input, actor)

    return sendSuccess(res, { message: 'Database berhasil dipulihkan dari backup', data: null })
  },
})