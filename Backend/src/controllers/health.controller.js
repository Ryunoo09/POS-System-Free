import { logger } from '../utils/logger.js'
import { sendError, sendSuccess } from '../utils/response.js'

export const createHealthController = ({ healthService }) => ({
  getHealth: async (_req, res) => {
    try {
      const data = await healthService.check()

      return sendSuccess(res, {
        message: 'Server is healthy',
        data,
      })
    } catch (error) {
      logger.error('Health check gagal', error)

      return sendError(res, {
        statusCode: 503,
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database tidak tersedia',
      })
    }
  },
})
