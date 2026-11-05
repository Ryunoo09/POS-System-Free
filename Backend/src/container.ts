import { prisma } from './config/database.js'
import { createAuthController } from './controllers/auth.controller.js'
import { createCategoryController } from './controllers/category.controller.js'
import { createHealthController } from './controllers/health.controller.js'
import { createProductController } from './controllers/product.controller.js'
import { createUserController } from './controllers/user.controller.js'
import { authenticate } from './middlewares/authenticate.js'
import { createCategoryRepository } from './repositories/category.repository.js'
import { createHealthRepository } from './repositories/health.repository.js'
import { createProductRepository } from './repositories/product.repository.js'
import { createStockMovementRepository } from './repositories/stock-movement.repository.js'
import { createUserRepository } from './repositories/user.repository.js'
import { createAuthService } from './services/auth.service.js'
import { createCategoryService } from './services/category.service.js'
import { createHealthService } from './services/health.service.js'
import { createProductService } from './services/product.service.js'
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

export const container: AppContainer = {
  healthController: createHealthController({ healthService }),
  authController: createAuthController({ authService }),
  productController: createProductController({ productService }),
  categoryController: createCategoryController({ categoryService }),
  userController: createUserController({ userService }),
  authenticate: authenticate({ userRepository }),
}
