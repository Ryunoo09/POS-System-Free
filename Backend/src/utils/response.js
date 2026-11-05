export const sendSuccess = (
  res,
  { statusCode = 200, message = 'Request successful', data = null, meta } = {},
) => {
  const payload = { success: true, message, data }

  if (meta !== undefined) {
    payload.meta = meta
  }

  return res.status(statusCode).json(payload)
}

export const sendError = (
  res,
  { statusCode = 500, message = 'Terjadi kesalahan pada server', code, errors = [] } = {},
) => {
  const payload = { success: false }

  if (code) {
    payload.code = code
  }

  payload.message = message
  payload.errors = errors

  return res.status(statusCode).json(payload)
}
