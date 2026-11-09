import { Router, type RequestHandler, type Router as ExpressRouter } from 'express'
import { PERMISSIONS } from '../constants/permissions.js'
import type { AuditController } from '../controllers/audit.controller.js'
import { authorize } from '../middlewares/authorize.js'
import { validate } from '../middlewares/validate.js'
import { listAuditLogsQuerySchema } from '../validators/audit.validator.js'

/**
 * Audit log bersifat append-only: hanya `GET`. Tidak ada route create/update/delete.
 */
export const createAuditRoutes = ({
  auditController,
  authenticate,
}: {
  auditController: AuditController
  authenticate: RequestHandler
}): ExpressRouter => {
  const router = Router()

  router.use(authenticate)

  router.get('/actors', authorize(PERMISSIONS.AUDIT_READ), auditController.actors)

  router.get(
    '/',
    authorize(PERMISSIONS.AUDIT_READ),
    validate({ query: listAuditLogsQuerySchema }),
    auditController.list,
  )

  return router
}