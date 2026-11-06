import { prisma } from './config/database.js'
import { createAuthController } from './controllers/auth.controller.js'
import { createCategoryController } from './controllers/category.controller.js'
import { createDashboardController } from './controllers/dashboard.controller.js'
import { createHealthController } from './controllers/health.controller.js'
import { createInventoryController } from './controllers/inventory.controller.js'
import { createProductController } from './controllers/product.controller.js'
import { createTransactionController } from './controllers/transaction.controller.js'
import { createUserController } from './controllers/user.controller.js'
import { authenticate } from './middlewares/authenticate.js'
import { createCategoryRepository } from './repositories/category.repository.js'
import { createHealthRepository } from './repositories/health.repository.js'
import { createInventoryRepository } from './repositories/inventory.repository.js'
import { createProductRepository } from './repositories/product.repository.js'
import { createReportRepository } from './repositories/report.repository.js'
import { createStockMovementRepository } from './repositories/stock-movement.repository.js'
import { createTransactionRepository } from './repositories/transaction.repository.js'
import { createUserRepository } from './repositories/user.repository.js'
import { createAuthService } from './services/auth.service.js'
import { createCategoryService } from './services/category.service.js'
import { createDashboardService } from './services/dashboard.service.js'
import { createHealthService } from './services/health.service.js'
import { createInventoryService } from './services/inventory.service.js'
import { createProductService } from './services/product.service.js'
import { createTransactionService } from './services/transaction.service.js'
import { createUserService } from './services/user.service.js'
import type { AppContainer } from './types/container.js'

const healthRepository = createHealthRepository(prisma)
const healthService = createHealthService({ healthRepository })

const userRepository = createUserRepository(prisma)
const authService = createAuthService({ userRepository })
const userService = createUserService({ userRepository })

const categoryRepository = createCategoryRepository(prisma)
const categoryService = createCategoryService({ categoryRepository })

const productRepository = createProductRepository(prisma)
const stockMovementRepository = createStockMovementRepository(prisma)
const productService = createProductService({
  productRepository,
  categoryRepository,
  stockMovementRepository,
})

const reportRepository = createReportRepository(prisma)
const dashboardService = createDashboardService({ reportRepository })

const inventoryRepository = createInventoryRepository(prisma)
const inventoryService = createInventoryService({
  inventoryRepository,
  productRepository,
  stockMovementRepository,
})

const transactionRepository = createTransactionRepository(prisma)
const transactionService = createTransactionService({ transactionRepository })

export const container: AppContainer = {
  healthController: createHealthController({ healthService }),
  authController: createAuthController({ authService }),
  dashboardController: createDashboardController({ dashboardService }),
  productController: createProductController({ productService }),
  categoryController: createCategoryController({ categoryService }),
  inventoryController: createInventoryController({ inventoryService }),
  transactionController: createTransactionController({ transactionService }),
  userController: createUserController({ userService }),
  authenticate: authenticate({ userRepository }),
}