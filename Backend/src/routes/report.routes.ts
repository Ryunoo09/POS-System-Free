import { Router, type RequestHandler, type Router as ExpressRouter } from 'express'
import { PERMISSIONS } from '../constants/permissions.js'
import type { ReportController } from '../controllers/report.controller.js'
import { authorize } from '../middlewares/authorize.js'
import { validate } from '../middlewares/validate.js'
import {
  cashierReportQuerySchema,
  productReportQuerySchema,
  salesReportQuerySchema,
} from '../validators/report.validator.js'

export const createReportRoutes = ({
  reportController,
  authenticate,
}: {
  reportController: ReportController
  authenticate: RequestHandler
}): ExpressRouter => {
  const router = Router()

  router.use(authenticate)
  router.use(authorize(PERMISSIONS.REPORT_READ))

  router.get('/sales', validate({ query: salesReportQuerySchema }), reportController.getSales)
  router.get(
    '/products',
    validate({ query: productReportQuerySchema }),
    reportController.getProducts,
  )
  router.get(
    '/cashiers',
    validate({ query: cashierReportQuerySchema }),
    reportController.getCashiers,
  )

  return router
}
