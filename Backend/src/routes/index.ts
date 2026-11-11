import { Router, type Router as ExpressRouter } from 'express'
import type { AppContainer } from '../types/container.js'
import { createAuthRoutes } from './auth.routes.js'
import { createCategoryRoutes } from './category.routes.js'
import { createDashboardRoutes } from './dashboard.routes.js'
import { createInventoryRoutes } from './inventory.routes.js'
import { createProductRoutes } from './product.routes.js'
import { createReportRoutes } from './report.routes.js'
import { createTransactionRoutes } from './transaction.routes.js'
import { createUserRoutes } from './user.routes.js'
import { createShiftRoutes } from './shift.routes.js'
import { createAuditRoutes } from './audit.routes.js'
import { createReturnRoutes } from './return.routes.js'
import { createSupplierRoutes } from './supplier.routes.js'
import { createPurchaseRoutes } from './purchase.routes.js'
import { createBackupRoutes } from './backup.routes.js'
import { createStockOpnameRoutes } from './stock-opname.routes.js'

export const createRoutes = (container: AppContainer): ExpressRouter => {
  const router = Router()

  router.get('/health', container.healthController.getHealth)
  router.use('/auth', createAuthRoutes(container))
  router.use('/dashboard', createDashboardRoutes(container))
  router.use('/users', createUserRoutes(container))
  router.use('/categories', createCategoryRoutes(container))
  router.use('/products', createProductRoutes(container))
  router.use('/inventory', createInventoryRoutes(container))
  router.use('/reports', createReportRoutes(container))
  router.use('/transactions', createTransactionRoutes(container))
  router.use('/shifts', createShiftRoutes(container))
  router.use('/audit-logs', createAuditRoutes(container))
  router.use('/returns', createReturnRoutes(container))
  router.use('/suppliers', createSupplierRoutes(container))
  router.use('/purchase-orders', createPurchaseRoutes(container))
  router.use('/backup', createBackupRoutes(container))
  router.use('/stock-opnames', createStockOpnameRoutes(container))

  return router
}