import type { RequestHandler } from 'express'
import type { AuthController } from '../controllers/auth.controller.js'
import type { CategoryController } from '../controllers/category.controller.js'
import type { DashboardController } from '../controllers/dashboard.controller.js'
import type { HealthController } from '../controllers/health.controller.js'
import type { InventoryController } from '../controllers/inventory.controller.js'
import type { ProductController } from '../controllers/product.controller.js'
import type { ReportController } from '../controllers/report.controller.js'
import type { TransactionController } from '../controllers/transaction.controller.js'
import type { UserController } from '../controllers/user.controller.js'

export interface AppContainer {
  healthController: HealthController
  authController: AuthController
  dashboardController: DashboardController
  productController: ProductController
  categoryController: CategoryController
  inventoryController: InventoryController
  reportController: ReportController
  transactionController: TransactionController
  userController: UserController
  authenticate: RequestHandler
}