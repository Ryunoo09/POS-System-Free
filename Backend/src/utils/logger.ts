type LogLevel = 'INFO' | 'WARN' | 'ERROR'

const methods: Record<LogLevel, 'info' | 'warn' | 'error'> = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
}

const write = (level: LogLevel, args: unknown[]): void => {
  const prefix = `[${new Date().toISOString()}] [${level}]`
  console[methods[level]](prefix, ...args)
}

export const logger = {
  info: (...args: unknown[]): void => write('INFO', args),
  warn: (...args: unknown[]): void => write('WARN', args),
  error: (...args: unknown[]): void => write('ERROR', args),
}
