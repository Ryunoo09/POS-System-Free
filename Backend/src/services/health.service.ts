import type { HealthRepository } from '../repositories/health.repository.js'

export interface HealthStatus {
  status: 'ok'
  database: 'ok'
  timestamp: string
}

export interface HealthService {
  check: () => Promise<HealthStatus>
}

export const createHealthService = ({
  healthRepository,
}: {
  healthRepository: HealthRepository
}): HealthService => ({
  check: async () => {
    await healthRepository.ping()

    return {
      status: 'ok',
      database: 'ok',
      timestamp: new Date().toISOString(),
    }
  },
})
