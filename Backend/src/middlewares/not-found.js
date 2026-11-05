import { sendError } from '../utils/response.js'

export const notFound = (req, res) =>
  sendError(res, {
    statusCode: 404,
    code: 'ROUTE_NOT_FOUND',
    message: `Route ${req.method} ${req.originalUrl} tidak ditemukan`,
  })
