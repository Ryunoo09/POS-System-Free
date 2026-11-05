import cors from 'cors'
import express, { type Express } from 'express'
import { env } from './config/env.js'
import { container as defaultContainer } from './container.js'
import { errorHandler } from './middlewares/error-handler.js'
import { notFound } from './middlewares/not-found.js'
import { securityHeaders } from './middlewares/security-headers.js'
import { createRoutes } from './routes/index.js'
import type { AppContainer } from './types/container.js'

export const createApp = ({ container = defaultContainer }: { container?: AppContainer } = {}): Express => {
  const app = express()

  app.disable('x-powered-by')
  app.use(securityHeaders)
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    }),
  )
  app.use(express.json({ limit: '100kb' }))
  app.use(express.urlencoded({ extended: false, limit: '100kb' }))

  app.use('/api', createRoutes(container))
  app.use(notFound)
  app.use(errorHandler)

  return app
}

export const app = createApp()
