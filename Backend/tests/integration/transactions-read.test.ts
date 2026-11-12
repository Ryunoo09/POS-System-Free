import { randomUUID } from 'node:crypto'
import bcrypt from 'bcrypt'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../src/app.js'
import { prisma } from '../../src/config/database.js'
import { signAccessToken } from '../../src/utils/jwt.js'

let adminToken: string
let ownerToken: string
let cashierToken: string
let cashierId: string
let otherCashierId: string
let categoryId: string
let productId: string

const auth = (token: string) => ({ Authorization: `Bearer ${token}` })

const cleanTransactions = async (): Promise<void> => {
  await prisma.stockMovement.deleteMany()
  await prisma.transactionItem.deleteMany()
  await prisma.transaction.deleteMany()
}

const cleanDatabase = async (): Promise<void> => {
  await cleanTransactions()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.user.deleteMany()
}

beforeAll(async () => {
  await cleanDatabase()

  const passwordHash = await bcrypt.hash('Read@12345', 4)
  const [admin, owner, cashier, otherCashier] = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Admin Read',
        email: 'admin.read@pos.local',
        passwordHash,
        role: 'ADMIN',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Owner Read',
        email: 'owner.read@pos.local',
        passwordHash,
        role: 'OWNER',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Kasir Satu',
        email: 'kasir.satu@pos.local',
        passwordHash,
        role: 'CASHIER',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Kasir Dua',
        email: 'kasir.dua@pos.local',
        passwordHash,
        role: 'CASHIER',
      },
    }),
  ])

  cashierId = cashier.id
  otherCashierId = otherCashier.id
  adminToken = signAccessToken({ sub: admin.id, role: 'ADMIN', tokenVersion: 0 })
  ownerToken = signAccessToken({ sub: owner.id, role: 'OWNER', tokenVersion: 0 })
  cashierToken = signAccessToken({ sub: cashier.id, role: 'CASHIER', tokenVersion: 0 })

  const category = await prisma.category.create({ data: { name: 'Kategori Read' } })
  categoryId = category.id

  const product = await prisma.product.create({
    data: {
      sku: 'READ-001',
      name: 'Produk Read',
      categoryId,
      unit: 'pcs',
      costPrice: '2000.00',
      sellingPrice: '3500.00',
      stock: 100,
      minStock: 0,
    },
  })
  productId = product.id
})

beforeEach(async () => {
  await cleanTransactions()
})

afterAll(async () => {
  await cleanDatabase()
  await prisma.$disconnect()
})

const createTransaction = async ({
  invoiceNumber,
  cashier,
  status = 'COMPLETED',
  paymentMethod = 'CASH',
  createdAt,
}: {
  invoiceNumber: string
  cashier: string
  status?: 'COMPLETED' | 'CANCELLED'
  paymentMethod?: 'CASH' | 'QRIS' | 'DEBIT_CARD' | 'BANK_TRANSFER'
  createdAt: string
}) =>
  prisma.transaction.create({
    data: {
      invoiceNumber,
      idempotencyKey: randomUUID(),
      cashierId: cashier,
      status,
      subtotal: '7000.00',
      discountAmount: '0.00',
      taxAmount: '0.00',
      totalAmount: '7000.00',
      paymentMethod,
      paymentReference: null,
      amountPaid: '20000.00',
      changeAmount: '13000.00',
      createdAt: new Date(createdAt),
      items: {
        create: [
          {
            productId,
            productNameSnapshot: 'Produk Read',
            productSkuSnapshot: 'READ-001',
            quantity: 2,
            unitPrice: '3500.00',
            unitCost: '2000.00',
            discountAmount: '0.00',
            subtotal: '7000.00',
          },
        ],
      },
    },
    include: { items: true },
  })

const seedTransactions = async () => {
  const first = await createTransaction({
    invoiceNumber: 'INV-20261101-000001',
    cashier: cashierId,
    createdAt: '2026-11-01T03:00:00Z',
  })
  const second = await createTransaction({
    invoiceNumber: 'INV-20261102-000002',
    cashier: otherCashierId,
    paymentMethod: 'QRIS',
    createdAt: '2026-11-02T03:00:00Z',
  })
  const third = await createTransaction({
    invoiceNumber: 'INV-20261103-000003',
    cashier: cashierId,
    status: 'CANCELLED',
    paymentMethod: 'DEBIT_CARD',
    createdAt: '2026-11-03T03:00:00Z',
  })

  return { first, second, third }
}

describe('GET /api/transactions', () => {
  it('menampilkan semua transaksi urut created_at menurun dengan pagination', async () => {
    const { second, third } = await seedTransactions()

    const response = await request(app)
      .get('/api/transactions')
      .query({ page: 1, limit: 2 })
      .set(auth(adminToken))

    expect(response.status).toBe(200)
    expect(response.body.data.map((item: { id: string }) => item.id)).toEqual([
      third.id,
      second.id,
    ])
    expect(response.body.data[0]).toMatchObject({
      invoice_number: 'INV-20261103-000003',
      cashier: { id: cashierId, name: 'Kasir Satu' },
      status: 'CANCELLED',
      payment_method: 'DEBIT_CARD',
      item_count: 1,
      total_amount: '7000.00',
    })
    expect(response.body.meta).toEqual({
      page: 1,
      limit: 2,
      total_items: 3,
      total_pages: 2,
    })
  })

  it('memfilter status, metode pembayaran, invoice, kasir, dan tanggal', async () => {
    const { first, second, third } = await seedTransactions()

    const cancelled = await request(app)
      .get('/api/transactions')
      .query({ status: 'CANCELLED' })
      .set(auth(adminToken))
    expect(cancelled.body.data.map((item: { id: string }) => item.id)).toEqual([third.id])

    const qris = await request(app)
      .get('/api/transactions')
      .query({ payment_method: 'QRIS' })
      .set(auth(adminToken))
    expect(qris.body.data.map((item: { id: string }) => item.id)).toEqual([second.id])

    const search = await request(app)
      .get('/api/transactions')
      .query({ search: '000002' })
      .set(auth(adminToken))
    expect(search.body.data.map((item: { id: string }) => item.id)).toEqual([second.id])

    const byCashier = await request(app)
      .get('/api/transactions')
      .query({ cashier_id: otherCashierId })
      .set(auth(adminToken))
    expect(byCashier.body.data.map((item: { id: string }) => item.id)).toEqual([second.id])

    const byDate = await request(app)
      .get('/api/transactions')
      .query({ start_date: '2026-11-01', end_date: '2026-11-01' })
      .set(auth(adminToken))
    expect(byDate.body.data.map((item: { id: string }) => item.id)).toEqual([first.id])
  })

  it('membatasi kasir ke transaksinya sendiri dan mengabaikan cashier_id', async () => {
    const { first, third } = await seedTransactions()

    const response = await request(app)
      .get('/api/transactions')
      .query({ cashier_id: otherCashierId })
      .set(auth(cashierToken))

    expect(response.status).toBe(200)
    expect(response.body.data.map((item: { id: string }) => item.id)).toEqual([third.id, first.id])
    expect(response.body.meta.total_items).toBe(2)
  })

  it('menolak filter yang tidak valid', async () => {
    const invalidMethod = await request(app)
      .get('/api/transactions')
      .query({ payment_method: 'BITCOIN' })
      .set(auth(adminToken))
    expect(invalidMethod.status).toBe(400)

    const invalidRange = await request(app)
      .get('/api/transactions')
      .query({ start_date: '2026-11-05', end_date: '2026-11-01' })
      .set(auth(adminToken))
    expect(invalidRange.status).toBe(400)
  })
})

describe('GET /api/transactions/:id', () => {
  it('menampilkan detail snapshot dan unit_cost untuk Admin/Owner', async () => {
    const { first } = await seedTransactions()

    const admin = await request(app)
      .get(`/api/transactions/${first.id}`)
      .set(auth(adminToken))
    const owner = await request(app)
      .get(`/api/transactions/${first.id}`)
      .set(auth(ownerToken))

    expect(admin.status).toBe(200)
    expect(admin.body.data.items[0]).toMatchObject({
      product_name: 'Produk Read',
      product_sku: 'READ-001',
      quantity: 2,
      unit_price: '3500.00',
      unit_cost: '2000.00',
      subtotal: '7000.00',
    })
    expect(owner.body.data.items[0].unit_cost).toBe('2000.00')
  })

  it('menyembunyikan unit_cost dari kasir', async () => {
    const { first } = await seedTransactions()

    const response = await request(app)
      .get(`/api/transactions/${first.id}`)
      .set(auth(cashierToken))

    expect(response.status).toBe(200)
    expect(response.body.data.items[0].unit_cost).toBeUndefined()
  })

  it('mengembalikan 404 saat kasir membuka transaksi kasir lain', async () => {
    const { second } = await seedTransactions()

    const response = await request(app)
      .get(`/api/transactions/${second.id}`)
      .set(auth(cashierToken))

    expect(response.status).toBe(404)
    expect(response.body.code).toBe('NOT_FOUND')
  })

  it('mengembalikan 404 untuk id yang tidak ada dan 400 untuk id tidak valid', async () => {
    const missing = await request(app)
      .get(`/api/transactions/${randomUUID()}`)
      .set(auth(adminToken))
    expect(missing.status).toBe(404)

    const invalid = await request(app)
      .get('/api/transactions/bukan-uuid')
      .set(auth(adminToken))
    expect(invalid.status).toBe(400)
  })

  it('mempertahankan snapshot setelah produk berubah', async () => {
    const response = await request(app)
      .post('/api/transactions')
      .set(auth(cashierToken))
      .set('Idempotency-Key', randomUUID())
      .send({
        items: [{ product_id: productId, quantity: 1 }],
        payment: { method: 'CASH', amount_paid: 3500 },
      })

    expect(response.status).toBe(201)
    const transactionId = response.body.data.id as string

    await prisma.product.update({
      where: { id: productId },
      data: {
        name: 'Produk Berubah',
        sku: 'READ-999',
        sellingPrice: '9000.00',
        costPrice: '8000.00',
      },
    })

    const detail = await request(app)
      .get(`/api/transactions/${transactionId}`)
      .set(auth(adminToken))

    expect(detail.body.data.items[0]).toMatchObject({
      product_name: 'Produk Read',
      product_sku: 'READ-001',
      unit_price: '3500.00',
      unit_cost: '2000.00',
    })

    await prisma.product.update({
      where: { id: productId },
      data: {
        name: 'Produk Read',
        sku: 'READ-001',
        sellingPrice: '3500.00',
        costPrice: '2000.00',
      },
    })
  })
})

describe('GET /api/transactions/cashiers', () => {
  it('menampilkan opsi kasir untuk Admin dan Owner', async () => {
    const admin = await request(app)
      .get('/api/transactions/cashiers')
      .set(auth(adminToken))
    const owner = await request(app)
      .get('/api/transactions/cashiers')
      .set(auth(ownerToken))

    expect(admin.status).toBe(200)
    expect(admin.body.data).toEqual([
      { id: otherCashierId, name: 'Kasir Dua' },
      { id: cashierId, name: 'Kasir Satu' },
    ])
    expect(owner.status).toBe(200)
  })

  it('menolak kasir dan tamu', async () => {
    const cashier = await request(app)
      .get('/api/transactions/cashiers')
      .set(auth(cashierToken))
    expect(cashier.status).toBe(403)

    const guest = await request(app).get('/api/transactions/cashiers')
    expect(guest.status).toBe(401)
  })
})
