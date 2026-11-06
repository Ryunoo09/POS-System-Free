import { randomUUID } from 'node:crypto'
import bcrypt from 'bcrypt'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '../../src/app.js'
import { prisma } from '../../src/config/database.js'
import { todayInJakarta } from '../../src/utils/date-range.js'
import { signAccessToken } from '../../src/utils/jwt.js'

let adminToken: string
let ownerToken: string
let cashierToken: string
let adminId: string
let productId: string

const productSku = 'INV-E2E-001'
const auth = (token: string) => ({ Authorization: `Bearer ${token}` })

const cleanDatabase = async (): Promise<void> => {
  await prisma.stockMovement.deleteMany()
  await prisma.transactionItem.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.user.deleteMany()
}

beforeAll(async () => {
  await cleanDatabase()

  const passwordHash = await bcrypt.hash('Inven@12345', 4)
  const admin = await prisma.user.create({
    data: { name: 'Admin Inven', email: 'admin.inv@pos.local', passwordHash, role: 'ADMIN' },
  })
  const owner = await prisma.user.create({
    data: { name: 'Owner Inven', email: 'owner.inv@pos.local', passwordHash, role: 'OWNER' },
  })
  const cashier = await prisma.user.create({
    data: { name: 'Kasir Inven', email: 'kasir.inv@pos.local', passwordHash, role: 'CASHIER' },
  })

  adminId = admin.id
  adminToken = signAccessToken({ sub: admin.id, role: 'ADMIN' })
  ownerToken = signAccessToken({ sub: owner.id, role: 'OWNER' })
  cashierToken = signAccessToken({ sub: cashier.id, role: 'CASHIER' })

  const category = await prisma.category.create({ data: { name: 'Kategori Inven' } })
  const product = await prisma.product.create({
    data: {
      sku: productSku,
      name: 'Produk Inven',
      categoryId: category.id,
      unit: 'pcs',
      costPrice: '1000.00',
      sellingPrice: '1500.00',
      stock: 10,
      minStock: 5,
    },
  })
  productId = product.id
})

afterAll(async () => {
  await cleanDatabase()
  await prisma.$disconnect()
})

describe('GET /api/inventory', () => {
  it('menampilkan produk aktif lengkap dengan nilai stok', async () => {
    const response = await request(app)
      .get('/api/inventory')
      .query({ search: productSku })
      .set(auth(adminToken))

    expect(response.status).toBe(200)
    expect(response.body.meta.total_items).toBe(1)
    expect(response.body.data[0]).toMatchObject({
      id: productId,
      sku: productSku,
      stock: 10,
      min_stock: 5,
      cost_price: '1000.00',
      stock_value: '10000.00',
      is_low_stock: false,
    })
  })

  it('mendukung filter kategori', async () => {
    const response = await request(app)
      .get('/api/inventory')
      .query({ category_id: '00000000-0000-0000-0000-000000000000' })
      .set(auth(adminToken))

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveLength(0)
    expect(response.body.meta.total_items).toBe(0)
  })

  it('Owner boleh melihat, Cashier ditolak', async () => {
    const owner = await request(app).get('/api/inventory').set(auth(ownerToken))
    const cashier = await request(app).get('/api/inventory').set(auth(cashierToken))

    expect(owner.status).toBe(200)
    expect(cashier.status).toBe(403)
  })
})

describe('POST /api/inventory/adjustments', () => {
  it('PURCHASE +20 menambah stok dan mencatat movement', async () => {
    const response = await request(app)
      .post('/api/inventory/adjustments')
      .set(auth(adminToken))
      .send({ product_id: productId, movement_type: 'PURCHASE', quantity: 20 })

    expect(response.status).toBe(201)
    expect(response.body.data.product).toMatchObject({ id: productId, stock: 30 })
    expect(response.body.data.movement).toMatchObject({
      movement_type: 'PURCHASE',
      quantity: 20,
      stock_before: 10,
      stock_after: 30,
      reference_type: 'MANUAL',
      reference_id: null,
      invoice_number: null,
      created_by: { id: adminId, name: 'Admin Inven' },
    })

    const product = await prisma.product.findUnique({ where: { id: productId } })
    expect(product?.stock).toBe(30)
  })

  it('ADJUSTMENT -5 dengan alasan mengurangi stok', async () => {
    const response = await request(app)
      .post('/api/inventory/adjustments')
      .set(auth(adminToken))
      .send({
        product_id: productId,
        movement_type: 'ADJUSTMENT',
        quantity: -5,
        notes: 'Barang rusak',
      })

    expect(response.status).toBe(201)
    expect(response.body.data.product.stock).toBe(25)
    expect(response.body.data.movement).toMatchObject({
      movement_type: 'ADJUSTMENT',
      quantity: -5,
      stock_before: 30,
      stock_after: 25,
      notes: 'Barang rusak',
    })
  })

  it('menolak stok negatif tanpa mengubah stok atau menambah movement', async () => {
    const before = await prisma.stockMovement.count({ where: { productId } })

    const response = await request(app)
      .post('/api/inventory/adjustments')
      .set(auth(adminToken))
      .send({
        product_id: productId,
        movement_type: 'ADJUSTMENT',
        quantity: -100,
        notes: 'Koreksi salah',
      })

    expect(response.status).toBe(422)
    expect(response.body.code).toBe('NEGATIVE_STOCK_NOT_ALLOWED')

    const product = await prisma.product.findUnique({ where: { id: productId } })
    const after = await prisma.stockMovement.count({ where: { productId } })
    expect(product?.stock).toBe(25)
    expect(after).toBe(before)
  })

  it('menolak ADJUSTMENT tanpa notes', async () => {
    const response = await request(app)
      .post('/api/inventory/adjustments')
      .set(auth(adminToken))
      .send({ product_id: productId, movement_type: 'ADJUSTMENT', quantity: -1 })

    expect(response.status).toBe(400)
    expect(response.body.code).toBe('VALIDATION_ERROR')
    expect(response.body.errors).toEqual(
      expect.arrayContaining([{ field: 'notes', message: 'Alasan wajib diisi untuk penyesuaian' }]),
    )
  })

  it('menolak PURCHASE dengan quantity negatif', async () => {
    const response = await request(app)
      .post('/api/inventory/adjustments')
      .set(auth(adminToken))
      .send({ product_id: productId, movement_type: 'PURCHASE', quantity: -1 })

    expect(response.status).toBe(400)
  })

  it('menolak Owner karena hanya Admin yang boleh menyesuaikan stok', async () => {
    const response = await request(app)
      .post('/api/inventory/adjustments')
      .set(auth(ownerToken))
      .send({ product_id: productId, movement_type: 'PURCHASE', quantity: 1 })

    expect(response.status).toBe(403)
  })
})

describe('GET /api/inventory/movements', () => {
  it('mengurutkan movement terbaru dan menyertakan produk serta pembuat', async () => {
    const response = await request(app)
      .get('/api/inventory/movements')
      .query({ product_id: productId })
      .set(auth(adminToken))

    expect(response.status).toBe(200)
    expect(response.body.meta.total_items).toBe(2)
    expect(response.body.data[0]).toMatchObject({
      movement_type: 'ADJUSTMENT',
      quantity: -5,
      stock_before: 30,
      stock_after: 25,
      product: { id: productId, sku: productSku, name: 'Produk Inven' },
      created_by: { id: adminId, name: 'Admin Inven' },
    })
    expect(response.body.data[1].movement_type).toBe('PURCHASE')
  })

  it('mendukung filter tipe dan tanggal', async () => {
    const today = todayInJakarta()
    const byType = await request(app)
      .get('/api/inventory/movements')
      .query({ movement_type: 'ADJUSTMENT' })
      .set(auth(adminToken))
    const byDate = await request(app)
      .get('/api/inventory/movements')
      .query({ start_date: today, end_date: today })
      .set(auth(adminToken))

    expect(byType.status).toBe(200)
    expect(byType.body.data).toHaveLength(1)
    expect(byDate.status).toBe(200)
    expect(byDate.body.meta.total_items).toBe(2)
  })

  it('menyertakan invoice_number untuk movement yang merujuk transaksi', async () => {
    const transaction = await prisma.transaction.create({
      data: {
        invoiceNumber: 'INV-INVEN-001',
        idempotencyKey: randomUUID(),
        cashierId: adminId,
        status: 'COMPLETED',
        subtotal: '1500.00',
        totalAmount: '1500.00',
        paymentMethod: 'CASH',
        amountPaid: '1500.00',
      },
    })

    await prisma.stockMovement.create({
      data: {
        productId,
        movementType: 'SALE',
        quantity: -1,
        stockBefore: 5,
        stockAfter: 4,
        referenceType: 'TRANSACTION',
        referenceId: transaction.id,
        createdById: adminId,
      },
    })

    const response = await request(app)
      .get('/api/inventory/movements')
      .query({ product_id: productId })
      .set(auth(adminToken))

    expect(response.status).toBe(200)
    expect(response.body.data[0]).toMatchObject({
      movement_type: 'SALE',
      invoice_number: 'INV-INVEN-001',
      reference_type: 'TRANSACTION',
      reference_id: transaction.id,
    })
  })
})

describe('GET /api/inventory/low-stock', () => {
  it('menyertakan produk dengan stock sama dengan min_stock', async () => {
    await prisma.product.update({ where: { id: productId }, data: { stock: 5 } })

    const response = await request(app)
      .get('/api/inventory/low-stock')
      .query({ limit: 10 })
      .set(auth(adminToken))

    expect(response.status).toBe(200)
    expect(response.body.meta.total_items).toBe(1)
    expect(response.body.data[0]).toMatchObject({
      id: productId,
      stock: 5,
      min_stock: 5,
      is_low_stock: true,
    })
  })
})