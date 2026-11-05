import type { RequestHandler } from 'express'
import type { AuthController } from '../controllers/auth.controller.js'
import type { HealthController } from '../controllers/health.controller.js'

export interface AppContainer {
  healthController: HealthController
  authController: AuthController
  authenticate: RequestHandler
}
