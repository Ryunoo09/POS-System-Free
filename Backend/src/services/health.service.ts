import type { CachePing, CacheService } from '../cache/cache.service.js'
import type { HealthRepository } from '../repositories/health.repository.js'

export interface HealthStatus {
  status: 'ok'
  database: 'ok'
  /** Redis opsional: 'disabled' berarti cache tidak dikonfigurasi/dimatikan. */
  redis: CachePing
  timestamp: string
}

export interface HealthService {
  check: () => Promise<HealthStatus>
}

export const createHealthService = ({
  healthRepository,
  cache,
}: {
  healthRepository: HealthRepository
  cache?: CacheService
}): HealthService => ({
  check: async () => {
    await healthRepository.ping()

    return {
      status: 'ok',
      database: 'ok',
      redis: cache ? await cache.ping() : 'disabled',
      timestamp: new Date().toISOString(),
    }
  },
})
