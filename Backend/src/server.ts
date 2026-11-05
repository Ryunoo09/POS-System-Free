import { createServer } from 'node:http'
import { app } from './app.js'
import { prisma } from './config/database.js'
import { env } from './config/env.js'
import { logger } from './utils/logger.js'

const server = createServer(app)

server.listen(env.PORT, () => {
  logger.info(`POS API berjalan di http://localhost:${env.PORT}`)
})

server.on('error', (error: Error) => {
  logger.error('Server gagal berjalan', error)
  process.exit(1)
})

let isShuttingDown = false

const shutdown = (signal: NodeJS.Signals): void => {
  if (isShuttingDown) return
  isShuttingDown = true

  logger.info(`Menerima ${signal}, menutup server...`)

  server.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })

  setTimeout(() => {
    logger.error('Shutdown melewati batas waktu')
    process.exit(1)
  }, 10_000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
