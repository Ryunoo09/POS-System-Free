import { prisma } from './config/database.js'
import { createAuthController } from './controllers/auth.controller.js'
import { createHealthController } from './controllers/health.controller.js'
import { authenticate } from './middlewares/authenticate.js'
import { createHealthRepository } from './repositories/health.repository.js'
import { createUserRepository } from './repositories/user.repository.js'
import { createAuthService } from './services/auth.service.js'
import { createHealthService } from './services/health.service.js'
import type { AppContainer } from './types/container.js'

const healthRepository = createHealthRepository(prisma)
const healthService = createHealthService({ healthRepository })

const userRepository = createUserRepository(prisma)
const authService = createAuthService({ userRepository })

export const container: AppContainer = {
  healthController: createHealthController({ healthService }),
  authController: createAuthController({ authService }),
  authenticate: authenticate({ userRepository }),
}
