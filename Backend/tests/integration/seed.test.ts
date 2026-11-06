import { afterAll, describe, expect, it } from 'vitest'
import { runSeed } from '../../prisma/seed.js'
import { prisma } from '../../src/config/database.js'

afterAll(async () => {
  await prisma.$disconnect()
})

describe('seed', () => {
  it('mengisi data development dengan jumlah sesuai PRD dan lolos verifyConsistency', async () => {
    const summary = await runSeed(prisma)

    expect(summary).toEqual({
      users: 4,
      categories: 5,
      products: 30,
      transactions: 20,
      movements: 96,
    })

    const invoices = await prisma.transaction.findMany({ select: { status: true } })
    expect(invoices.every((row) => row.status === 'COMPLETED')).toBe(true)
  })

  it('menandai tepat tiga produk sebagai stok rendah lewat penyesuaian', async () => {
    const rows = await prisma.$queryRaw<Array<{ sku: string }>>`
      SELECT sku FROM products WHERE stock <= min_stock ORDER BY sku
    `

    expect(rows.map((row) => row.sku)).toEqual(['MNM-006', 'PCR-005', 'RTG-005'])
  })
})
