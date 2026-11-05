import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import { env } from '../src/config/env.js'

const prisma = new PrismaClient()

interface SeedUser {
  name: string
  email: string
  password: string
  role: 'ADMIN' | 'OWNER' | 'CASHIER'
}

/**
 * Seed B1: akun development (PRD §16.3).
 * Data master lain (kategori, produk, transaksi) ditambahkan pada fase D5.
 */
const users: SeedUser[] = [
  { name: 'Andi Pratama', email: 'admin@pos.local', password: 'Admin@12345', role: 'ADMIN' },
  { name: 'Rina Kusuma', email: 'owner@pos.local', password: 'Owner@12345', role: 'OWNER' },
  { name: 'Siti Rahma', email: 'kasir1@pos.local', password: 'Kasir@12345', role: 'CASHIER' },
  { name: 'Budi Santoso', email: 'kasir2@pos.local', password: 'Kasir@12345', role: 'CASHIER' },
]

const seedUsers = async (): Promise<void> => {
  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, env.BCRYPT_SALT_ROUNDS)

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        isActive: true,
        passwordHash,
      },
      create: {
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: true,
        passwordHash,
      },
    })

    console.log(`[seed] user siap: ${user.email} (${user.role})`)
  }
}

const main = async (): Promise<void> => {
  if (env.NODE_ENV === 'production') {
    throw new Error('Seed tidak boleh dijalankan di NODE_ENV=production')
  }

  await seedUsers()
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error: unknown) => {
    console.error('[seed] gagal:', error)
    await prisma.$disconnect()
    process.exitCode = 1
  })
