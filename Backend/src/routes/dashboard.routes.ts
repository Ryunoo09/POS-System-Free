import { Router, type RequestHandler, type Router as ExpressRouter } from 'express'
import { PERMISSIONS } from '../constants/permissions.js'
import type { DashboardController } from '../controllers/dashboard.controller.js'
import { authorize } from '../middlewares/authorize.js'
import { validate } from '../middlewares/validate.js'
import {
  dashboardQuerySchema,
  topProductsQuerySchema,
} from '../validators/dashboard.validator.js'

export const createDashboardRoutes = ({
  dashboardController,
  authenticate,
}: {
  dashboardController: DashboardController
  authenticate: RequestHandler
}): ExpressRouter => {
  const router = Router()

  router.use(authenticate)
  router.use(authorize(PERMISSIONS.DASHBOARD_READ))

  router.get('/summary', validate({ query: dashboardQuerySchema }), dashboardController.getSummary)
  router.get('/sales', validate({ query: dashboardQuerySchema }), dashboardController.getSales)
  router.get(
    '/breakdown',
    validate({ query: dashboardQuerySchema }),
    dashboardController.getBreakdown,
  )
  router.get(
    '/top-products',
    validate({ query: topProductsQuerySchema }),
    dashboardController.getTopProducts,
  )

  return router
}