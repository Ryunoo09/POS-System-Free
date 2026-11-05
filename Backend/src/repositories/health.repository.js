export const createHealthRepository = (prisma) => ({
  ping: () => prisma.$queryRaw`SELECT 1`,
})
