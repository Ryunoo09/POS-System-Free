import { Router, type Router as ExpressRouter } from 'express'
import type { AppContainer } from '../types/container.js'
import { createAuthRoutes } from './auth.routes.js'

export const createRoutes = (container: AppContainer): ExpressRouter => {
  const router = Router()

  router.get('/health', container.healthController.getHealth)
  router.use('/auth', createAuthRoutes(container))

  return router
}
