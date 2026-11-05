const methods = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
}

const write = (level, args) => {
  const prefix = `[${new Date().toISOString()}] [${level}]`
  console[methods[level]](prefix, ...args)
}

export const logger = {
  info: (...args) => write('INFO', args),
  warn: (...args) => write('WARN', args),
  error: (...args) => write('ERROR', args),
}
