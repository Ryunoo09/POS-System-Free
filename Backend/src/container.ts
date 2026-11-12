import { prisma } from './config/database.js'
import { env } from './config/env.js'
import { createAuthController } from './controllers/auth.controller.js'
import { createCategoryController } from './controllers/category.controller.js'
import { createDashboardController } from './controllers/dashboard.controller.js'
import { createHealthController } from './controllers/health.controller.js'
import { createInventoryController } from './controllers/inventory.controller.js'
import { createProductController } from './controllers/product.controller.js'
import { createReportController } from './controllers/report.controller.js'
import { createTransactionController } from './controllers/transaction.controller.js'
import { createUserController } from './controllers/user.controller.js'
import { createShiftController } from './controllers/shift.controller.js'
import { createAuditController } from './controllers/audit.controller.js'
import { createReturnController } from './controllers/return.controller.js'
import { createSupplierController } from './controllers/supplier.controller.js'
import { createPurchaseController } from './controllers/purchase.controller.js'
import { createBackupController } from './controllers/backup.controller.js'
import { createStockOpnameController } from './controllers/stock-opname.controller.js'
import { authenticate } from './middlewares/authenticate.js'
import { createLoginRateLimiter } from './middlewares/login-rate-limit.js'
import { createCategoryRepository } from './repositories/category.repository.js'
import { createHealthRepository } from './repositories/health.repository.js'
import { createInventoryRepository } from './repositories/inventory.repository.js'
import { createProductRepository } from './repositories/product.repository.js'
import { createPriceRepository } from './repositories/price.repository.js'
import { createReportRepository } from './repositories/report.repository.js'
import { createStockMovementRepository } from './repositories/stock-movement.repository.js'
import { createTransactionRepository } from './repositories/transaction.repository.js'
import { createUserRepository } from './repositories/user.repository.js'
import { createShiftRepository } from './repositories/shift.repository.js'
import { createAuditRepository } from './repositories/audit.repository.js'
import { createReturnRepository } from './repositories/return.repository.js'
import { createSupplierRepository } from './repositories/supplier.repository.js'
import { createPurchaseOrderRepository } from './repositories/purchase.repository.js'
import { createStockOpnameRepository } from './repositories/stock-opname.repository.js'
import { createAuthService } from './services/auth.service.js'
import { createCategoryService } from './services/category.service.js'
import { createDashboardService } from './services/dashboard.service.js'
import { createHealthService } from './services/health.service.js'
import { createInventoryService } from './services/inventory.service.js'
import { createProductService } from './services/product.service.js'
import { createPriceService } from './services/price.service.js'
import { createReportService } from './services/report.service.js'
import { createTransactionService } from './services/transaction.service.js'
import { createUserService } from './services/user.service.js'
import { createShiftService } from './services/shift.service.js'
import { createAuditService } from './services/audit.service.js'
import { createReturnService } from './services/return.service.js'
import { createSupplierService } from './services/supplier.service.js'
import { createPurchaseService } from './services/purchase.service.js'
import { createBackupService } from './services/backup.service.js'
import { createStockOpnameService } from './services/stock-opname.service.js'
import type { AppContainer } from './types/container.js'

const healthRepository = createHealthRepository(prisma)
const healthService = createHealthService({ healthRepository })

const auditRepository = createAuditRepository(prisma)
const auditService = createAuditService(auditRepository)

const userRepository = createUserRepository(prisma)
const authService = createAuthService({ userRepository })
const userService = createUserService({ userRepository, audit: auditService })

const categoryRepository = createCategoryRepository(prisma)
const categoryService = createCategoryService({ categoryRepository })

const productRepository = createProductRepository(prisma)
const stockMovementRepository = createStockMovementRepository(prisma)
const priceRepository = createPriceRepository(prisma)
const priceService = createPriceService({ priceRepository, productRepository })
const productService = createProductService({
  productRepository,
  categoryRepository,
  stockMovementRepository,
  audit: auditService,
  priceService,
})

const reportRepository = createReportRepository(prisma)
const dashboardService = createDashboardService({ reportRepository })
const reportService = createReportService({ reportRepository })

const inventoryRepository = createInventoryRepository(prisma)
const inventoryService = createInventoryService({
  inventoryRepository,
  productRepository,
  stockMovementRepository,
  audit: auditService,
})

const shiftRepository = createShiftRepository(prisma)
const shiftService = createShiftService(shiftRepository)

const transactionRepository = createTransactionRepository(prisma)
const transactionService = createTransactionService({
  transactionRepository,
  productRepository,
  stockMovementRepository,
  shiftRepository,
  priceService,
  taxRate: env.TAX_RATE,
})

const returnRepository = createReturnRepository(prisma)
const returnService = createReturnService({
  returnRepository,
  transactionRepository,
  productRepository,
  stockMovementRepository,
  shiftRepository,
  audit: auditService,
})

const supplierRepository = createSupplierRepository(prisma)
const supplierService = createSupplierService({ supplierRepository, audit: auditService })

const purchaseOrderRepository = createPurchaseOrderRepository(prisma)
const purchaseService = createPurchaseService({
  purchaseOrderRepository,
  supplierRepository,
  productRepository,
  stockMovementRepository,
  priceService,
  audit: auditService,
})

export const backupService = createBackupService({ userRepository, audit: auditService })

const stockOpnameRepository = createStockOpnameRepository(prisma)
const stockOpnameService = createStockOpnameService({
  stockOpnameRepository,
  productRepository,
  stockMovementRepository,
  audit: auditService,
})

export const container: AppContainer = {
  healthController: createHealthController({ healthService }),
  authController: createAuthController({ authService }),
  dashboardController: createDashboardController({ dashboardService }),
  productController: createProductController({ productService, priceService }),
  categoryController: createCategoryController({ categoryService }),
  inventoryController: createInventoryController({ inventoryService }),
  reportController: createReportController({ reportService }),
  transactionController: createTransactionController({ transactionService }),
  userController: createUserController({ userService }),
  shiftController: createShiftController({ shiftService }),
  auditController: createAuditController({ auditService }),
  returnController: createReturnController({ returnService }),
  supplierController: createSupplierController({ supplierService }),
  purchaseController: createPurchaseController({ purchaseService }),
  backupController: createBackupController({ backupService }),
  stockOpnameController: createStockOpnameController({ stockOpnameService }),
  authenticate: authenticate({ userRepository }),
  loginRateLimiter: createLoginRateLimiter({
    maxAttempts: env.LOGIN_RATE_LIMIT_MAX,
    windowMs: env.LOGIN_RATE_LIMIT_WINDOW_MS,
  }),
}