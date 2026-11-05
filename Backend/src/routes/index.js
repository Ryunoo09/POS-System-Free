import { Router } from 'express'

export const createRoutes = ({ healthController }) => {
  const router = Router()

  router.get('/health', healthController.getHealth)

  return router
}
