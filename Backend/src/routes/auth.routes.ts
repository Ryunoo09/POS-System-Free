import { Router, type RequestHandler, type Router as ExpressRouter } from 'express'
import type { AuthController } from '../controllers/auth.controller.js'
import { validate } from '../middlewares/validate.js'
import { loginSchema } from '../validators/auth.validator.js'

export const createAuthRoutes = ({
  authController,
  authenticate,
  loginRateLimiter,
}: {
  authController: AuthController
  authenticate: RequestHandler
  loginRateLimiter?: RequestHandler
}): ExpressRouter => {
  const router = Router()

  const loginHandlers = [
    ...(loginRateLimiter ? [loginRateLimiter] : []),
    validate({ body: loginSchema }),
    authController.login,
  ]

  router.post('/login', ...loginHandlers)
  router.get('/me', authenticate, authController.me)
  router.post('/logout', authenticate, authController.logout)

  return router
}
