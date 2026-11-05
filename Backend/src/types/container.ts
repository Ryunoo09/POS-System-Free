import type { RequestHandler } from 'express'
import type { AuthController } from '../controllers/auth.controller.js'
import type { CategoryController } from '../controllers/category.controller.js'
import type { HealthController } from '../controllers/health.controller.js'
import type { ProductController } from '../controllers/product.controller.js'
import type { UserController } from '../controllers/user.controller.js'

export interface AppContainer {
  healthController: HealthController
  authController: AuthController
  productController: ProductController
  categoryController: CategoryController
  userController: UserController
  authenticate: RequestHandler
}
