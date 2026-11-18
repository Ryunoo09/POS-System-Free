import { createServer, type Server } from 'node:http'
import { app } from './app.js'
import { prisma } from './config/database.js'
import { env } from './config/env.js'
import { closeRedis } from './config/redis.js'
import { backupService } from './container.js'
import { startBackupScheduler, stopBackupScheduler } from './scheduler/backup.scheduler.js'
import { logger } from './utils/logger.js'

// ponytail: Vercel serverless (no pg_dump binary, no persistent FS, no long-lived process) skips
// the daily backup scheduler and the standalone HTTP listener. The Express app is served as a
// Vercel Function via the `services` framework "express" adapter, which creates its own HTTP
// server internally — app.listen must not run in that mode.
const isServerless = process.env.VERCEL === 'true'

let server: Server | null = null

if (!isServerless) {
  server = createServer(app)

  server.listen(env.PORT, () => {
    logger.info(`POS API berjalan di http://localhost:${env.PORT}`)
    startBackupScheduler(backupService)
  })

  server.on('error', (error: Error) => {
    logger.error('Server gagal berjalan', error)
    process.exit(1)
  })
}

export default app

let isShuttingDown = false

const shutdown = (signal: NodeJS.Signals): void => {
  if (isShuttingDown) return
  isShuttingDown = true

  logger.info(`Menerima ${signal}, menutup server...`)

  stopBackupScheduler()

  if (server) {
    server.close(async () => {
      await closeRedis()
      await prisma.$disconnect()
      process.exit(0)
    })

    setTimeout(() => {
      logger.error('Shutdown melewati batas waktu')
      process.exit(1)
    }, 10_000).unref()
  } else {
    // Serverless: no HTTP server to close, just release DB/Redis and let the runtime recycle.
    void (async () => {
      await closeRedis()
      await prisma.$disconnect()
    })()
  }
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
