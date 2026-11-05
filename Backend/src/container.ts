import { prisma } from './config/database.js'
import { createHealthController } from './controllers/health.controller.js'
import { createHealthRepository } from './repositories/health.repository.js'
import { createHealthService } from './services/health.service.js'
import type { AppContainer } from './types/container.js'

const healthRepository = createHealthRepository(prisma)
const healthService = createHealthService({ healthRepository })

export const container: AppContainer = {
  healthController: createHealthController({ healthService }),
}
