import { randomUUID } from 'node:crypto'
import bcrypt from 'bcrypt'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { app, createApp } from '../../src/app.js'
import { prisma } from '../../src/config/database.js'
import { container } from '../../src/container.js'
import { createTransactionController } from '../../src/controllers/transaction.controller.js'
import { createProductRepository } from '../../src/repositories/product.repository.js'
import { createPriceRepository } from '../../src/repositories/price.repository.js'
import { createTransactionRepository } from '../../src/repositories/transaction.repository.js'
import { createTransactionService } from '../../src/services/transaction.service.js'
import { createPriceService } from '../../src/services/price.service.js'
import { logger } from '../../src/utils/logger.js'
import { signAccessToken } from '../../src/utils/jwt.js'

let adminToken: string
let cashierToken: string
let cashierId: string
let categoryId: string

const auth = (token: string) => ({ Authorization: `Bearer ${token}` })

const cleanTransactions = async (): Promise<void> => {
  await prisma.stockMovement.deleteMany()
  await prisma.transactionItem.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.product.deleteMany()
}

const cleanDatabase = async (): Promise<void> => {
  await cleanTransactions()
  await prisma.category.deleteMany()
  await prisma.user.deleteMany()
}

beforeAll(async () => {
  await cleanDatabase()

  const passwordHash = await bcrypt.hash('Checkout@12345', 4)
  const admin = await prisma.user.create({
    data: {
      name: 'Admin Checkout',
      email: 'admin.checkout@pos.local',
      passwordHash,
      role: 'ADMIN',
    },
  })
  const cashier = await prisma.user.create({
    data: {
      name: 'Kasir Checkout',
      email: 'kasir.checkout@pos.local',
      passwordHash,
      role: 'CASHIER',
    },
  })

  cashierId = cashier.id
  adminToken = signAccessToken({ sub: admin.id, role: 'ADMIN', tokenVersion: 0 })
  cashierToken = signAccessToken({ sub: cashier.id, role: 'CASHIER', tokenVersion: 0 })

  const category = await prisma.category.create({ data: { name: 'Kategori Checkout' } })
  categoryId = category.id
})

beforeEach(async () => {
  await cleanTransactions()
})

afterAll(async () => {
  await cleanDatabase()
  await prisma.$disconnect()
})

const createProduct = (overrides: Record<string, unknown> = {}) =>
  prisma.product.create({
    data: {
      sku: `SKU-${randomUUID().slice(0, 8)}`,
      name: 'Produk Checkout',
      categoryId,
      unit: 'pcs',
      costPrice: '2000.00',
      sellingPrice: '3500.00',
      stock: 10,
      minStock: 0,
      ...overrides,
    },
  })

const checkout = (
  body: object,
  idempotencyKey: string = randomUUID(),
  token: string = cashierToken,
) =>
  request(app)
    .post('/api/transactions')
    .set(auth(token))
    .set('Idempotency-Key', idempotencyKey)
    .send(body)

const cashPayload = (productId: string, quantity = 2, amountPaid = 20000) => ({
  items: [{ product_id: productId, quantity }],
  payment: { method: 'CASH', amount_paid: amountPaid },
})

describe('POST /api/transactions', () => {
  it('checkout tunai berhasil, stok berkurang, dan movement SALE tercatat', async () => {
    const product = await createProduct({ stock: 10 })

    const response = await checkout(cashPayload(product.id))

    expect(response.status).toBe(201)
    expect(response.body.message).toBe('Transaksi berhasil')
    expect(response.body.data).toMatchObject({
      status: 'COMPLETED',
      cashier: { id: cashierId, name: 'Kasir Checkout' },
      subtotal: '7000.00',
      discount_amount: '0.00',
      tax_amount: '0.00',
      total_amount: '7000.00',
      payment_method: 'CASH',
      payment_reference: null,
      amount_paid: '20000.00',
      change_amount: '13000.00',
    })
    expect(response.body.data.invoice_number).toMatch(/^INV-\d{8}-\d{6}$/)
    expect(response.body.data.items).toHaveLength(1)
    expect(response.body.data.items[0]).toMatchObject({
      product_id: product.id,
      product_name: 'Produk Checkout',
      product_sku: product.sku,
      quantity: 2,
      unit_price: '3500.00',
      discount_amount: '0.00',
      subtotal: '7000.00',
    })
    expect(response.body.data.items[0].unit_cost).toBeUndefined()

    const updated = await prisma.product.findUnique({ where: { id: product.id } })
    expect(updated?.stock).toBe(8)

    const movements = await prisma.stockMovement.findMany({
      where: { productId: product.id },
    })
    expect(movements).toHaveLength(1)
    expect(movements[0]).toMatchObject({
      movementType: 'SALE',
      quantity: -2,
      stockBefore: 10,
      stockAfter: 8,
      referenceType: 'TRANSACTION',
      referenceId: response.body.data.id,
      createdById: cashierId,
    })
  })

  it('checkout non-tunai pas berhasil dengan referensi', async () => {
    const product = await createProduct({ stock: 5 })

    const response = await checkout({
      items: [{ product_id: product.id, quantity: 1 }],
      payment: {
        method: 'QRIS',
        amount_paid: 3500,
        reference: 'QR-001',
      },
    })

    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({
      payment_method: 'QRIS',
      payment_reference: 'QR-001',
      amount_paid: '3500.00',
      change_amount: '0.00',
    })
  })

  it('menolak request yang memuat harga', async () => {
    const product = await createProduct()

    const response = await checkout({
      items: [{ product_id: product.id, quantity: 1, unit_price: 1 }],
      payment: { method: 'CASH', amount_paid: 3500 },
    })

    expect(response.status).toBe(400)
    expect(response.body.code).toBe('VALIDATION_ERROR')

    const totalResponse = await checkout({
      items: [{ product_id: product.id, quantity: 1 }],
      total: 3500,
      payment: { method: 'CASH', amount_paid: 3500 },
    })

    expect(totalResponse.status).toBe(400)
  })

  it('menolak header Idempotency-Key yang hilang atau bukan UUID v4', async () => {
    const product = await createProduct()

    const missing = await request(app)
      .post('/api/transactions')
      .set(auth(cashierToken))
      .send(cashPayload(product.id))

    expect(missing.status).toBe(400)

    const invalid = await checkout(cashPayload(product.id), 'bukan-uuid')
    expect(invalid.status).toBe(400)
    expect(invalid.body.code).toBe('VALIDATION_ERROR')
  })

  it('menolak product_id duplikat', async () => {
    const product = await createProduct()

    const response = await checkout({
      items: [
        { product_id: product.id, quantity: 1 },
        { product_id: product.id, quantity: 1 },
      ],
      payment: { method: 'CASH', amount_paid: 7000 },
    })

    expect(response.status).toBe(400)
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'items[1].product_id' }),
      ]),
    )
  })

  it('mengembalikan 404 untuk produk yang tidak ditemukan', async () => {
    const response = await checkout({
      items: [{ product_id: randomUUID(), quantity: 1 }],
      payment: { method: 'CASH', amount_paid: 3500 },
    })

    expect(response.status).toBe(404)
  })

  it('menolak produk nonaktif tanpa mengubah stok atau membuat transaksi', async () => {
    const product = await createProduct({ isActive: false })

    const response = await checkout(cashPayload(product.id))

    expect(response.status).toBe(422)
    expect(response.body.code).toBe('PRODUCT_INACTIVE')
    expect(await prisma.transaction.count()).toBe(0)
    expect((await prisma.product.findUnique({ where: { id: product.id } }))?.stock).toBe(10)
  })

  it('menolak pembayaran tunai yang kurang', async () => {
    const product = await createProduct()

    const response = await checkout(cashPayload(product.id, 1, 1000))

    expect(response.status).toBe(422)
    expect(response.body.code).toBe('INSUFFICIENT_PAYMENT')
    expect(await prisma.transaction.count()).toBe(0)
  })

  it('menolak pembayaran non-tunai yang tidak sama dengan total', async () => {
    const product = await createProduct()

    const response = await checkout({
      items: [{ product_id: product.id, quantity: 1 }],
      payment: { method: 'BANK_TRANSFER', amount_paid: 3501 },
    })

    expect(response.status).toBe(422)
    expect(response.body.code).toBe('INVALID_PAYMENT_AMOUNT')
  })

  it('menolak diskon transaksi yang melebihi subtotal', async () => {
    const product = await createProduct()

    const response = await checkout({
      items: [{ product_id: product.id, quantity: 1 }],
      discount_amount: 4000,
      payment: { method: 'CASH', amount_paid: 3500 },
    })

    expect(response.status).toBe(422)
    expect(response.body.code).toBe('INVALID_DISCOUNT')
  })

  it('memakai harga dari database, bukan harga yang dikirim klien', async () => {
    const product = await createProduct({ sellingPrice: '5000.00' })

    const response = await checkout(cashPayload(product.id, 1, 5000))

    expect(response.status).toBe(201)
    expect(response.body.data.subtotal).toBe('5000.00')
    expect(response.body.data.total_amount).toBe('5000.00')
  })

  it('mengembalikan transaksi yang sama untuk idempotency key berurutan', async () => {
    const product = await createProduct({ stock: 10 })
    const key = randomUUID()
    const payload = cashPayload(product.id)

    const first = await checkout(payload, key)
    const second = await checkout(payload, key)

    expect(first.status).toBe(201)
    expect(second.status).toBe(200)
    expect(second.body.data.id).toBe(first.body.data.id)
    expect(second.body.data.invoice_number).toBe(first.body.data.invoice_number)
    expect(await prisma.transaction.count()).toBe(1)
    expect(await prisma.transactionItem.count()).toBe(1)
    expect((await prisma.product.findUnique({ where: { id: product.id } }))?.stock).toBe(8)
  })

  it('menangani idempotency key bersamaan dengan satu transaksi', async () => {
    const product = await createProduct({ stock: 10 })
    const key = randomUUID()
    const payload = cashPayload(product.id)

    const [first, second] = await Promise.all([
      checkout(payload, key),
      checkout(payload, key),
    ])

    expect([first.status, second.status].sort()).toEqual([200, 201])
    expect(await prisma.transaction.count()).toBe(1)
    expect((await prisma.product.findUnique({ where: { id: product.id } }))?.stock).toBe(8)
  })

  it('hanya satu checkout berhasil saat stok tersisa satu', async () => {
    const product = await createProduct({ stock: 1 })

    const [first, second] = await Promise.all([
      checkout(cashPayload(product.id, 1, 3500)),
      checkout(cashPayload(product.id, 1, 3500)),
    ])

    const statuses = [first.status, second.status].sort()
    expect(statuses).toEqual([201, 422])
    expect((await prisma.product.findUnique({ where: { id: product.id } }))?.stock).toBe(0)
    expect(await prisma.transaction.count()).toBe(1)
  })

  it('tepat lima dari sepuluh checkout paralel berhasil saat stok lima', async () => {
    const product = await createProduct({ stock: 5 })

    const responses = await Promise.all(
      Array.from({ length: 10 }, () => checkout(cashPayload(product.id, 1, 3500))),
    )

    const statuses = responses.map((response) => response.status)
    expect(statuses.filter((status) => status === 201)).toHaveLength(5)
    expect(statuses.filter((status) => status === 422)).toHaveLength(5)
    expect((await prisma.product.findUnique({ where: { id: product.id } }))?.stock).toBe(0)
    expect(await prisma.transaction.count()).toBe(5)
  })

  it('rollback total bila pembuatan movement gagal', async () => {
    const product = await createProduct({ stock: 10 })
    const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})

    const failingApp = createApp({
      container: {
        ...container,
        transactionController: createTransactionController({
          transactionService: createTransactionService({
            transactionRepository: createTransactionRepository(prisma),
            productRepository: createProductRepository(prisma),
            stockMovementRepository: {
              create: async () => {
                throw new Error('injeksi kegagalan movement')
              },
              list: async () => ({ items: [], total: 0 }),
            },
            priceService: createPriceService({
              priceRepository: createPriceRepository(prisma),
              productRepository: createProductRepository(prisma),
            }),
            taxRate: 0,
          }),
        }),
      },
    })

    const response = await request(failingApp)
      .post('/api/transactions')
      .set(auth(cashierToken))
      .set('Idempotency-Key', randomUUID())
      .send(cashPayload(product.id))

    loggerSpy.mockRestore()

    expect(response.status).toBe(500)
    expect(await prisma.transaction.count()).toBe(0)
    expect(await prisma.transactionItem.count()).toBe(0)
    expect(await prisma.stockMovement.count()).toBe(0)
    expect((await prisma.product.findUnique({ where: { id: product.id } }))?.stock).toBe(10)
  })

  it('menolak Admin karena checkout hanya untuk kasir', async () => {
    const product = await createProduct()

    const response = await checkout(cashPayload(product.id), randomUUID(), adminToken)

    expect(response.status).toBe(403)
  })
})
