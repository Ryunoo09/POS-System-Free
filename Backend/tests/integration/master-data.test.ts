import bcrypt from 'bcrypt'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '../../src/app.js'
import { prisma } from '../../src/config/database.js'
import { signAccessToken } from '../../src/utils/jwt.js'

let adminToken: string
let cashierToken: string
let adminId: string

const auth = (token: string) => ({ Authorization: `Bearer ${token}` })

const cleanDatabase = async (): Promise<void> => {
  await prisma.stockMovement.deleteMany()
  await prisma.transactionItem.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.user.deleteMany()
}

const createCategory = async (name: string): Promise<string> => {
  const response = await request(app).post('/api/categories').set(auth(adminToken)).send({ name })
  expect(response.status).toBe(201)

  return response.body.data.id as string
}

const createProduct = async (body: Record<string, unknown>, token = adminToken) =>
  request(app).post('/api/products').set(auth(token)).send(body)

beforeAll(async () => {
  await cleanDatabase()

  const passwordHash = await bcrypt.hash('Ada@12345', 4)
  const admin = await prisma.user.create({
    data: { name: 'Admin Test', email: 'admin.test@pos.local', passwordHash, role: 'ADMIN' },
  })
  const cashier = await prisma.user.create({
    data: { name: 'Kasir Test', email: 'kasir.test@pos.local', passwordHash, role: 'CASHIER' },
  })

  adminId = admin.id
  adminToken = signAccessToken({ sub: admin.id, role: 'ADMIN' })
  cashierToken = signAccessToken({ sub: cashier.id, role: 'CASHIER' })
})

afterAll(async () => {
  await cleanDatabase()
  await prisma.$disconnect()
})

describe('categories API', () => {
  it('membuat kategori dan menolak nama duplikat (case-insensitive)', async () => {
    const created = await request(app)
      .post('/api/categories')
      .set(auth(adminToken))
      .send({ name: 'Minuman', description: 'Segar' })

    expect(created.status).toBe(201)
    expect(created.body.data).toMatchObject({ name: 'Minuman', product_count: 0, is_active: true })

    const duplicate = await request(app)
      .post('/api/categories')
      .set(auth(adminToken))
      .send({ name: 'minuman' })

    expect(duplicate.status).toBe(409)
    expect(duplicate.body.code).toBe('DUPLICATE_CATEGORY')
  })

  it('menyertakan product_count dan meta pagination pada list', async () => {
    await createCategory('Snack')
    const categoryId = await createCategory('Kopi')
    await createProduct({
      sku: 'KOPI-001',
      name: 'Kopi Sachet',
      category_id: categoryId,
      unit: 'sachet',
      cost_price: 1500,
      selling_price: 2500,
      stock: 0,
      min_stock: 0,
    })

    const list = await request(app).get('/api/categories?limit=5').set(auth(adminToken))

    expect(list.status).toBe(200)
    expect(list.body.meta).toMatchObject({ page: 1, limit: 5 })
    const kopi = (list.body.data as Array<{ id: string; product_count: number }>).find(
      (item) => item.id === categoryId,
    )
    expect(kopi?.product_count).toBe(1)
  })

  it('Cashier hanya melihat kategori aktif', async () => {
    const categoryId = await createCategory('Arsip')
    await request(app)
      .put(`/api/categories/${categoryId}`)
      .set(auth(adminToken))
      .send({ is_active: false })

    const cashierList = await request(app).get('/api/categories').set(auth(cashierToken))
    const adminList = await request(app).get('/api/categories').set(auth(adminToken))

    expect(
      (cashierList.body.data as Array<{ is_active: boolean }>).every((item) => item.is_active),
    ).toBe(true)
    expect(
      (adminList.body.data as Array<{ is_active: boolean }>).some((item) => !item.is_active),
    ).toBe(true)
  })

  it('menolak hapus kategori yang masih dipakai dengan 409 CATEGORY_IN_USE', async () => {
    const categoryId = await createCategory('Dipakai')
    await createProduct({
      sku: 'DIPAKAI-001',
      name: 'Produk Dipakai',
      category_id: categoryId,
      unit: 'pcs',
      cost_price: 1000,
      selling_price: 1500,
      stock: 0,
      min_stock: 0,
    })

    const response = await request(app)
      .delete(`/api/categories/${categoryId}`)
      .set(auth(adminToken))

    expect(response.status).toBe(409)
    expect(response.body.code).toBe('CATEGORY_IN_USE')
  })

  it('menghapus kategori kosong', async () => {
    const categoryId = await createCategory('Kosong')

    const response = await request(app)
      .delete(`/api/categories/${categoryId}`)
      .set(auth(adminToken))

    expect(response.status).toBe(200)

    const list = await request(app).get('/api/categories').set(auth(adminToken))
    expect(
      (list.body.data as Array<{ id: string }>).some((item) => item.id === categoryId),
    ).toBe(false)
  })
})

describe('products API', () => {
  it('membuat produk stok 10 dan mencatat tepat satu movement INITIAL_STOCK', async () => {
    const categoryId = await createCategory('Elektronik')
    const response = await createProduct({
      sku: 'ELK-001',
      barcode: '8991000000100',
      name: 'Kabel USB',
      category_id: categoryId,
      unit: 'pcs',
      cost_price: 5000,
      selling_price: 8000,
      stock: 10,
      min_stock: 2,
    })

    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({ stock: 10, is_low_stock: false, cost_price: '5000.00' })

    const movements = await prisma.stockMovement.findMany({
      where: { productId: response.body.data.id as string },
    })

    expect(movements).toHaveLength(1)
    expect(movements[0]).toMatchObject({
      movementType: 'INITIAL_STOCK',
      quantity: 10,
      stockBefore: 0,
      stockAfter: 10,
    })
  })

  it('menolak SKU dan barcode duplikat', async () => {
    const categoryId = await createCategory('Duplikat')
    await createProduct({
      sku: 'DUP-001',
      barcode: '8991000000200',
      name: 'Produk A',
      category_id: categoryId,
      unit: 'pcs',
      cost_price: 1000,
      selling_price: 1500,
      stock: 1,
      min_stock: 0,
    })

    const duplicateSku = await createProduct({
      sku: 'DUP-001',
      name: 'Produk B',
      category_id: categoryId,
      unit: 'pcs',
      cost_price: 1000,
      selling_price: 1500,
      stock: 0,
      min_stock: 0,
    })
    const duplicateBarcode = await createProduct({
      sku: 'DUP-002',
      barcode: '8991000000200',
      name: 'Produk C',
      category_id: categoryId,
      unit: 'pcs',
      cost_price: 1000,
      selling_price: 1500,
      stock: 0,
      min_stock: 0,
    })

    expect(duplicateSku.status).toBe(409)
    expect(duplicateSku.body.code).toBe('DUPLICATE_SKU')
    expect(duplicateBarcode.status).toBe(409)
    expect(duplicateBarcode.body.code).toBe('DUPLICATE_BARCODE')
  })

  it('menolak kategori nonaktif dengan 422 dan harga negatif dengan 400', async () => {
    const categoryId = await createCategory('Nonaktif')
    await request(app)
      .put(`/api/categories/${categoryId}`)
      .set(auth(adminToken))
      .send({ is_active: false })

    const inactiveCategory = await createProduct({
      sku: 'INA-001',
      name: 'Produk Nonaktif',
      category_id: categoryId,
      unit: 'pcs',
      cost_price: 1000,
      selling_price: 1500,
      stock: 0,
      min_stock: 0,
    })
    const negativePrice = await createProduct({
      sku: 'NEG-001',
      name: 'Harga Negatif',
      category_id: categoryId,
      unit: 'pcs',
      cost_price: -1,
      selling_price: 1500,
      stock: 0,
      min_stock: 0,
    })

    expect(inactiveCategory.status).toBe(422)
    expect(inactiveCategory.body.code).toBe('CATEGORY_INACTIVE')
    expect(negativePrice.status).toBe(400)
  })

  it('menyembunyikan cost_price dan memaksa produk aktif untuk Cashier', async () => {
    const categoryId = await createCategory('Visibilitas')
    await createProduct({
      sku: 'VIS-001',
      name: 'Produk Aktif',
      category_id: categoryId,
      unit: 'pcs',
      cost_price: 1000,
      selling_price: 1500,
      stock: 3,
      min_stock: 1,
    })
    const toDeactivate = await createProduct({
      sku: 'VIS-002',
      name: 'Produk Nonaktif',
      category_id: categoryId,
      unit: 'pcs',
      cost_price: 1000,
      selling_price: 1500,
      stock: 3,
      min_stock: 1,
    })
    await request(app)
      .delete(`/api/products/${toDeactivate.body.data.id as string}`)
      .set(auth(adminToken))

    const cashierList = await request(app)
      .get('/api/products?is_active=false')
      .set(auth(cashierToken))
    const adminList = await request(app)
      .get('/api/products?is_active=false')
      .set(auth(adminToken))

    const cashierItems = cashierList.body.data as Array<Record<string, unknown>>
    expect(cashierItems.length).toBeGreaterThan(0)
    expect(cashierItems.every((item) => item.is_active === true)).toBe(true)
    expect(cashierItems.every((item) => !('cost_price' in item))).toBe(true)
    expect(adminList.body.data[0]).toHaveProperty('cost_price')
  })

  it('memperbarui produk tanpa stok dan menolak field stock', async () => {
    const categoryId = await createCategory('Update')
    const created = await createProduct({
      sku: 'UPD-001',
      name: 'Produk Update',
      category_id: categoryId,
      unit: 'pcs',
      cost_price: 1000,
      selling_price: 1500,
      stock: 4,
      min_stock: 0,
    })
    const productId = created.body.data.id as string

    const validUpdate = await request(app)
      .put(`/api/products/${productId}`)
      .set(auth(adminToken))
      .send({ name: 'Nama Baru' })

    const invalidUpdate = await request(app)
      .put(`/api/products/${productId}`)
      .set(auth(adminToken))
      .send({ stock: 99 })

    expect(validUpdate.status).toBe(200)
    expect(validUpdate.body.data.name).toBe('Nama Baru')
    expect(validUpdate.body.data.stock).toBe(4)
    expect(invalidUpdate.status).toBe(400)
  })

  it('menonaktifkan produk (soft delete)', async () => {
    const categoryId = await createCategory('SoftDelete')
    const created = await createProduct({
      sku: 'DEL-001',
      name: 'Produk Hapus',
      category_id: categoryId,
      unit: 'pcs',
      cost_price: 1000,
      selling_price: 1500,
      stock: 1,
      min_stock: 0,
    })
    const productId = created.body.data.id as string

    const response = await request(app)
      .delete(`/api/products/${productId}`)
      .set(auth(adminToken))

    expect(response.status).toBe(200)
    expect(response.body.data.is_active).toBe(false)

    const stored = await prisma.product.findUnique({ where: { id: productId } })
    expect(stored?.isActive).toBe(false)
  })
})

describe('users API', () => {
  it('Admin membuat pengguna tanpa mengembalikan password dan menolak email duplikat', async () => {
    const created = await request(app).post('/api/users').set(auth(adminToken)).send({
      name: 'Kasir Baru',
      email: 'kasir.baru@pos.local',
      password: 'Kasir@12345',
      role: 'CASHIER',
    })

    expect(created.status).toBe(201)
    expect(JSON.stringify(created.body)).not.toContain('passwordHash')
    expect(created.body.data).toMatchObject({ email: 'kasir.baru@pos.local', role: 'CASHIER' })

    const duplicate = await request(app).post('/api/users').set(auth(adminToken)).send({
      name: 'Kasir Lain',
      email: 'KASIR.BARU@pos.local',
      password: 'Kasir@12345',
      role: 'CASHIER',
    })

    expect(duplicate.status).toBe(409)
    expect(duplicate.body.code).toBe('DUPLICATE_EMAIL')
  })

  it('menolak password lemah dengan 400', async () => {
    const response = await request(app).post('/api/users').set(auth(adminToken)).send({
      name: 'Lemah',
      email: 'lemah@pos.local',
      password: 'lemah',
      role: 'CASHIER',
    })

    expect(response.status).toBe(400)
    expect(response.body.code).toBe('VALIDATION_ERROR')
  })

  it('melindungi admin aktif terakhir dan admin tidak dapat menonaktifkan diri sendiri', async () => {
    const selfDeactivate = await request(app)
      .put(`/api/users/${adminId}`)
      .set(auth(adminToken))
      .send({ is_active: false })
    const demoteLastAdmin = await request(app)
      .put(`/api/users/${adminId}`)
      .set(auth(adminToken))
      .send({ role: 'CASHIER' })

    expect(selfDeactivate.status).toBe(422)
    expect(selfDeactivate.body.code).toBe('LAST_ADMIN_PROTECTED')
    expect(demoteLastAdmin.status).toBe(422)
    expect(demoteLastAdmin.body.code).toBe('LAST_ADMIN_PROTECTED')
  })

  it('Cashier tidak boleh mengakses endpoint pengguna', async () => {
    const response = await request(app).get('/api/users').set(auth(cashierToken))

    expect(response.status).toBe(403)
    expect(response.body.code).toBe('PERMISSION_DENIED')
  })
})
