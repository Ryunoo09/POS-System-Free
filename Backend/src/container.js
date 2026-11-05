import { prisma } from './config/database.js'
import { createHealthController } from './controllers/health.controller.js'
import { createHealthRepository } from './repositories/health.repository.js'
import { createHealthService } from './services/health.service.js'

const healthRepository = createHealthRepository(prisma)
const healthService = createHealthService({ healthRepository })

export const container = {
  healthController: createHealthController({ healthService }),
}
