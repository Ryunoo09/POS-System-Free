import { Router, type Router as ExpressRouter } from 'express'
import type { AppContainer } from '../types/container.js'
import { createAuthRoutes } from './auth.routes.js'
import { createCategoryRoutes } from './category.routes.js'
import { createProductRoutes } from './product.routes.js'
import { createUserRoutes } from './user.routes.js'

export const createRoutes = (container: AppContainer): ExpressRouter => {
  const router = Router()

  router.get('/health', container.healthController.getHealth)
  router.use('/auth', createAuthRoutes(container))
  router.use('/users', createUserRoutes(container))
  router.use('/categories', createCategoryRoutes(container))
  router.use('/products', createProductRoutes(container))

  return router
}
