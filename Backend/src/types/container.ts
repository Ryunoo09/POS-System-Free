import type { HealthController } from '../controllers/health.controller.js'

export interface AppContainer {
  healthController: HealthController
}
