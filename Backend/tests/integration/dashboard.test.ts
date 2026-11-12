import { randomUUID } from 'node:crypto'
import bcrypt from 'bcrypt'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '../../src/app.js'
import { prisma } from '../../src/config/database.js'
import { signAccessToken } from '../../src/utils/jwt.js'

let adminToken: string
let cashierToken: string

const auth = (token: string) => ({ Authorization: `Bearer ${token}` })

const cleanDatabase = async (): Promise<void> => {
  await prisma.stockMovement.deleteMany()
  await prisma.transactionItem.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.user.deleteMany()
}

let productAId: string
let productBId: string
let categoryId: string

beforeAll(async () => {
  await cleanDatabase()

  const passwordHash = await bcrypt.hash('Ada@12345', 4)
  const admin = await prisma.user.create({
    data: { name: 'Admin Dashboard', email: 'admin.dash@pos.local', passwordHash, role: 'ADMIN' },
  })
  const cashier = await prisma.user.create({
    data: { name: 'Kasir Dashboard', email: 'kasir.dash@pos.local', passwordHash, role: 'CASHIER' },
  })

  adminToken = signAccessToken({ sub: admin.id, role: 'ADMIN', tokenVersion: 0 })
  cashierToken = signAccessToken({ sub: cashier.id, role: 'CASHIER', tokenVersion: 0 })

  const category = await prisma.category.create({ data: { name: 'Kategori Dashboard' } })
  categoryId = category.id
  const productA = await prisma.product.create({
    data: {
      sku: 'DASH-A',
      name: 'Produk A',
      categoryId: category.id,
      unit: 'pcs',
      costPrice: '30000.00',
      sellingPrice: '50000.00',
      stock: 2,
      minStock: 5,
    },
  })
  const productB = await prisma.product.create({
    data: {
      sku: 'DASH-B',
      name: 'Produk B',
      categoryId: category.id,
      unit: 'pcs',
      costPrice: '20000.00',
      sellingPrice: '50000.00',
      stock: 10,
      minStock: 5,
    },
  })
  productAId = productA.id
  productBId = productB.id

  // 2026-11-01 23:30 WIB
  await prisma.transaction.create({
    data: {
      invoiceNumber: 'INV-DASH-001',
      idempotencyKey: randomUUID(),
      cashierId: cashier.id,
      status: 'COMPLETED',
      subtotal: '100000.00',
      discountAmount: '10000.00',
      taxAmount: '0.00',
      totalAmount: '90000.00',
      paymentMethod: 'CASH',
      amountPaid: '100000.00',
      changeAmount: '10000.00',
      createdAt: new Date('2026-11-01T16:30:00Z'),
      items: {
        create: [
          {
            productId: productA.id,
            productNameSnapshot: 'Produk A',
            productSkuSnapshot: 'DASH-A',
            quantity: 2,
            unitPrice: '50000.00',
            unitCost: '30000.00',
            discountAmount: '0.00',
            subtotal: '100000.00',
          },
        ],
      },
    },
  })

  // 2026-11-02 00:30 WIB (masih 2026-11-01 UTC)
  await prisma.transaction.create({
    data: {
      invoiceNumber: 'INV-DASH-002',
      idempotencyKey: randomUUID(),
      cashierId: admin.id,
      status: 'COMPLETED',
      subtotal: '50000.00',
      discountAmount: '0.00',
      taxAmount: '0.00',
      totalAmount: '50000.00',
      paymentMethod: 'QRIS',
      amountPaid: '50000.00',
      changeAmount: '0.00',
      createdAt: new Date('2026-11-01T17:30:00Z'),
      items: {
        create: [
          {
            productId: productB.id,
            productNameSnapshot: 'Produk B',
            productSkuSnapshot: 'DASH-B',
            quantity: 1,
            unitPrice: '50000.00',
            unitCost: '20000.00',
            discountAmount: '0.00',
            subtotal: '50000.00',
          },
        ],
      },
    },
  })

  // Transaksi CANCELLED tidak boleh ikut dihitung.
  await prisma.transaction.create({
    data: {
      invoiceNumber: 'INV-DASH-003',
      idempotencyKey: randomUUID(),
      cashierId: cashier.id,
      status: 'CANCELLED',
      subtotal: '999999.00',
      discountAmount: '0.00',
      taxAmount: '0.00',
      totalAmount: '999999.00',
      paymentMethod: 'CASH',
      amountPaid: '999999.00',
      changeAmount: '0.00',
      createdAt: new Date('2026-11-03T05:00:00Z'),
      items: {
        create: [
          {
            productId: productA.id,
            productNameSnapshot: 'Produk A',
            productSkuSnapshot: 'DASH-A',
            quantity: 100,
            unitPrice: '50000.00',
            unitCost: '30000.00',
            discountAmount: '0.00',
            subtotal: '5000000.00',
          },
        ],
      },
    },
  })
})

afterAll(async () => {
  await cleanDatabase()
  await prisma.$disconnect()
})

describe('dashboard API', () => {
  it('menghitung summary tanpa transaksi CANCELLED', async () => {
    const response = await request(app)
      .get('/api/dashboard/summary')
      .query({ start_date: '2026-11-01', end_date: '2026-11-03' })
      .set(auth(adminToken))

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      period: { start_date: '2026-11-01', end_date: '2026-11-03' },
      revenue: '140000.00',
      cogs: '80000.00',
      gross_profit: '60000.00',
      transaction_count: 2,
      total_products: 2,
      total_stock: 12,
      low_stock_count: 1,
      previous: {
        period: { start_date: '2026-10-29', end_date: '2026-10-31' },
        revenue: '0.00',
        cogs: '0.00',
        gross_profit: '0.00',
        transaction_count: 0,
      },
    })
  })

  it('memakai jendela durasi sama untuk delta KPI', async () => {
    const response = await request(app)
      .get('/api/dashboard/summary')
      .query({ start_date: '2026-11-02', end_date: '2026-11-03' })
      .set(auth(adminToken))

    expect(response.status).toBe(200)
    // 2 hari: 2026-11-02..03 -> sebelumnya 2026-10-31..2026-11-01 (berisi 1 transaksi).
    expect(response.body.data.previous).toEqual({
      period: { start_date: '2026-10-31', end_date: '2026-11-01' },
      revenue: '90000.00',
      cogs: '60000.00',
      gross_profit: '30000.00',
      transaction_count: 1,
    })
  })

  it('mengelompokkan breakdown pembayaran dan kategori', async () => {
    const response = await request(app)
      .get('/api/dashboard/breakdown')
      .query({ start_date: '2026-11-01', end_date: '2026-11-03' })
      .set(auth(adminToken))

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      payment_methods: [
        { payment_method: 'CASH', transaction_count: 1, revenue: '90000.00' },
        { payment_method: 'QRIS', transaction_count: 1, revenue: '50000.00' },
      ],
      categories: [
        {
          category_id: categoryId,
          category: 'Kategori Dashboard',
          quantity_sold: 3,
          revenue: '150000.00',
        },
      ],
    })
  })

  it('mengisi hari tanpa transaksi dengan 0 dan memakai batas WIB', async () => {
    const response = await request(app)
      .get('/api/dashboard/sales')
      .query({ start_date: '2026-11-01', end_date: '2026-11-03' })
      .set(auth(adminToken))

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([
      { date: '2026-11-01', revenue: '90000.00', transaction_count: 1 },
      { date: '2026-11-02', revenue: '50000.00', transaction_count: 1 },
      { date: '2026-11-03', revenue: '0.00', transaction_count: 0 },
    ])
  })

  it('mengurutkan produk terlaris berdasarkan quantity', async () => {
    const response = await request(app)
      .get('/api/dashboard/top-products')
      .query({ start_date: '2026-11-01', end_date: '2026-11-03', limit: 5 })
      .set(auth(adminToken))

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([
      {
        product_id: productAId,
        sku: 'DASH-A',
        name: 'Produk A',
        quantity_sold: 2,
        revenue: '100000.00',
      },
      {
        product_id: productBId,
        sku: 'DASH-B',
        name: 'Produk B',
        quantity_sold: 1,
        revenue: '50000.00',
      },
    ])
  })

  it('menolak rentang tidak valid dan rentang lebih dari 366 hari', async () => {
    const reversed = await request(app)
      .get('/api/dashboard/summary')
      .query({ start_date: '2026-11-03', end_date: '2026-11-01' })
      .set(auth(adminToken))
    const tooLong = await request(app)
      .get('/api/dashboard/summary')
      .query({ start_date: '2025-01-01', end_date: '2026-01-02' })
      .set(auth(adminToken))

    expect(reversed.status).toBe(400)
    expect(tooLong.status).toBe(400)
  })

  it('menolak Cashier mengakses dashboard', async () => {
    const response = await request(app)
      .get('/api/dashboard/summary')
      .set(auth(cashierToken))

    expect(response.status).toBe(403)
    expect(response.body.code).toBe('PERMISSION_DENIED')
  })
})

describe('inventory low-stock API', () => {
  it('hanya mengembalikan produk aktif dengan stock <= min_stock', async () => {
    const response = await request(app)
      .get('/api/inventory/low-stock')
      .query({ limit: 10 })
      .set(auth(adminToken))

    expect(response.status).toBe(200)
    expect(response.body.meta).toMatchObject({ page: 1, limit: 10, total_items: 1 })
    expect(response.body.data).toHaveLength(1)
    expect(response.body.data[0]).toMatchObject({
      id: productAId,
      stock: 2,
      min_stock: 5,
      is_low_stock: true,
    })
  })

  it('menolak Cashier mengakses inventori', async () => {
    const response = await request(app)
      .get('/api/inventory/low-stock')
      .set(auth(cashierToken))

    expect(response.status).toBe(403)
  })
})

describe('transactions API', () => {
  it('Admin melihat semua transaksi terbaru', async () => {
    const response = await request(app)
      .get('/api/transactions')
      .query({ status: 'COMPLETED', limit: 5 })
      .set(auth(adminToken))

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveLength(2)
    expect(response.body.data[0].invoice_number).toBe('INV-DASH-002')
    expect(response.body.data[0].cashier.name).toBe('Admin Dashboard')
    expect(response.body.meta.total_items).toBe(2)
  })

  it('Cashier hanya melihat transaksinya sendiri', async () => {
    const response = await request(app)
      .get('/api/transactions')
      .query({ status: 'COMPLETED' })
      .set(auth(cashierToken))

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveLength(1)
    expect(response.body.data[0].invoice_number).toBe('INV-DASH-001')
  })
})

describe('reports API', () => {
  it('mengembalikan ringkasan yang identik dengan dashboard', async () => {
    const dashboard = await request(app)
      .get('/api/dashboard/summary')
      .query({ start_date: '2026-11-01', end_date: '2026-11-03' })
      .set(auth(adminToken))
    const report = await request(app)
      .get('/api/reports/sales')
      .query({ start_date: '2026-11-01', end_date: '2026-11-03' })
      .set(auth(adminToken))

    expect(report.status).toBe(200)
    expect(report.body.data.summary).toEqual({
      revenue: dashboard.body.data.revenue,
      cogs: dashboard.body.data.cogs,
      gross_profit: dashboard.body.data.gross_profit,
      transaction_count: dashboard.body.data.transaction_count,
      gross_margin_pct: dashboard.body.data.gross_margin_pct,
    })
    expect(report.body.data.summary).toEqual({
      revenue: '140000.00',
      cogs: '80000.00',
      gross_profit: '60000.00',
      transaction_count: 2,
      gross_margin_pct: '42.86',
    })
  })

  it('mengelompokkan penjualan harian dengan batas WIB', async () => {
    const response = await request(app)
      .get('/api/reports/sales')
      .query({ start_date: '2026-11-01', end_date: '2026-11-03', group_by: 'daily' })
      .set(auth(adminToken))

    expect(response.status).toBe(200)
    expect(response.body.data.rows).toEqual([
      {
        period: '2026-11-01',
        period_label: '1 Nov 2026',
        transaction_count: 1,
        revenue: '90000.00',
        cogs: '60000.00',
        gross_profit: '30000.00',
        gross_margin_pct: '33.33',
      },
      {
        period: '2026-11-02',
        period_label: '2 Nov 2026',
        transaction_count: 1,
        revenue: '50000.00',
        cogs: '20000.00',
        gross_profit: '30000.00',
        gross_margin_pct: '60.00',
      },
    ])
  })

  it('mengelompokkan penjualan bulanan', async () => {
    const response = await request(app)
      .get('/api/reports/sales')
      .query({ start_date: '2026-11-01', end_date: '2026-11-30', group_by: 'monthly' })
      .set(auth(adminToken))

    expect(response.status).toBe(200)
    expect(response.body.data.rows).toEqual([
      {
        period: '2026-11-01',
        period_label: 'November 2026',
        transaction_count: 2,
        revenue: '140000.00',
        cogs: '80000.00',
        gross_profit: '60000.00',
        gross_margin_pct: '42.86',
      },
    ])
  })

  it('mendaftar penjualan produk dengan pagination dan urutan terlaris', async () => {
    const response = await request(app)
      .get('/api/reports/products')
      .query({ start_date: '2026-11-01', end_date: '2026-11-03', sort: 'best_selling', limit: 1 })
      .set(auth(adminToken))

    expect(response.status).toBe(200)
    expect(response.body.meta).toEqual({ page: 1, limit: 1, total_items: 2, total_pages: 2 })
    expect(response.body.data.rows).toEqual([
      {
        product_id: productAId,
        sku: 'DASH-A',
        name: 'Produk A',
        category: 'Kategori Dashboard',
        quantity_sold: 2,
        revenue: '100000.00',
        cogs: '60000.00',
        gross_profit: '40000.00',
        gross_margin_pct: '40.00',
      },
    ])
  })

  it('memfilter penjualan produk berdasarkan kategori', async () => {
    const matching = await request(app)
      .get('/api/reports/products')
      .query({
        start_date: '2026-11-01',
        end_date: '2026-11-03',
        category_id: categoryId,
      })
      .set(auth(adminToken))
    const empty = await request(app)
      .get('/api/reports/products')
      .query({
        start_date: '2026-11-01',
        end_date: '2026-11-03',
        category_id: randomUUID(),
      })
      .set(auth(adminToken))

    expect(matching.body.meta.total_items).toBe(2)
    expect(empty.body.meta.total_items).toBe(0)
    expect(empty.body.data.rows).toEqual([])
    // Ringkasan tetap mencakup seluruh rentang, bukan hanya kategori terfilter.
    expect(empty.body.data.summary.transaction_count).toBe(2)
  })

  it('mendaftar performa kasir dengan rata-rata transaksi', async () => {
    const response = await request(app)
      .get('/api/reports/cashiers')
      .query({ start_date: '2026-11-01', end_date: '2026-11-03' })
      .set(auth(adminToken))

    expect(response.status).toBe(200)
    expect(response.body.data.rows).toEqual([
      {
        cashier_id: expect.any(String),
        cashier_name: 'Kasir Dashboard',
        transaction_count: 1,
        revenue: '90000.00',
        gross_profit: '30000.00',
        average_transaction: '90000.00',
      },
      {
        cashier_id: expect.any(String),
        cashier_name: 'Admin Dashboard',
        transaction_count: 1,
        revenue: '50000.00',
        gross_profit: '30000.00',
        average_transaction: '50000.00',
      },
    ])
  })

  it('menolak rentang tidak valid, tanggal wajib, dan akses Cashier', async () => {
    const reversed = await request(app)
      .get('/api/reports/sales')
      .query({ start_date: '2026-11-03', end_date: '2026-11-01' })
      .set(auth(adminToken))
    const missing = await request(app)
      .get('/api/reports/sales')
      .set(auth(adminToken))
    const forbidden = await request(app)
      .get('/api/reports/sales')
      .query({ start_date: '2026-11-01', end_date: '2026-11-03' })
      .set(auth(cashierToken))

    expect(reversed.status).toBe(400)
    expect(missing.status).toBe(400)
    expect(forbidden.status).toBe(403)
    expect(forbidden.body.code).toBe('PERMISSION_DENIED')
  })
})