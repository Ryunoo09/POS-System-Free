import { Router, type RequestHandler, type Router as ExpressRouter } from 'express'
import { PERMISSIONS } from '../constants/permissions.js'
import type { BackupController } from '../controllers/backup.controller.js'
import { authorize } from '../middlewares/authorize.js'
import { validate } from '../middlewares/validate.js'
import {
  backupFilenameParamSchema,
  restoreBackupSchema,
} from '../validators/backup.validator.js'

export const createBackupRoutes = ({
  backupController,
  authenticate,
}: {
  backupController: BackupController
  authenticate: RequestHandler
}): ExpressRouter => {
  const router = Router()

  router.use(authenticate, authorize(PERMISSIONS.BACKUP_MANAGE))

  router.get('/list', backupController.list)
  router.post('/create', backupController.create)
  router.get(
    '/download/:filename',
    validate({ params: backupFilenameParamSchema }),
    backupController.download,
  )
  router.post('/restore', validate({ body: restoreBackupSchema }), backupController.restore)

  return router
}