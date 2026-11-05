import type { RequestHandler } from 'express'
import { sendError } from '../utils/response.js'

export const notFound: RequestHandler = (req, res) =>
  sendError(res, {
    statusCode: 404,
    code: 'ROUTE_NOT_FOUND',
    message: `Route ${req.method} ${req.originalUrl} tidak ditemukan`,
  })
