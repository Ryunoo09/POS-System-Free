import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Integration test memakai satu database test; jalankan file secara berurutan.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://postgres@localhost:5433/pos_test?schema=public',
      JWT_SECRET: 'test-secret-that-is-at-least-32-characters',
      JWT_EXPIRES_IN: '8h',
      BCRYPT_SALT_ROUNDS: '4',
      CORS_ORIGIN: 'http://localhost:5173',
      TAX_RATE: '0',
    },
  },
})
