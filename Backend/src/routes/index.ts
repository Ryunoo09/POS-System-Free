import { Router, type Router as ExpressRouter } from 'express'
import type { AppContainer } from '../types/container.js'

export const createRoutes = ({ healthController }: AppContainer): ExpressRouter => {
  const router = Router()

  router.get('/health', healthController.getHealth)

  return router
}
