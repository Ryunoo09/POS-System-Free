export const createHealthService = ({ healthRepository }) => ({
  check: async () => {
    await healthRepository.ping()

    return {
      status: 'ok',
      database: 'ok',
      timestamp: new Date().toISOString(),
    }
  },
})
