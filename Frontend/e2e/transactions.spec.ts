import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const API_URL = 'http://localhost:3000/api'

const login = async (page: Page, email: string, password: string) => {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()
}

const uniqueSuffix = () =>
  `${Date.now()}${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')}`

const apiLogin = async (
  api: APIRequestContext,
  email: string,
  password: string,
): Promise<string> => {
  const response = await api.post(`${API_URL}/auth/login`, { data: { email, password } })
  expect(response.ok()).toBeTruthy()

  const body = await response.json()
  return body.data.token as string
}

const createProduct = async (
  api: APIRequestContext,
  token: string,
  suffix: string,
): Promise<{ id: string; name: string }> => {
  const headers = { Authorization: `Bearer ${token}` }
  const categoryResponse = await api.post(`${API_URL}/categories`, {
    headers,
    data: { name: `Kategori Riwayat ${suffix}` },
  })
  expect(categoryResponse.ok()).toBeTruthy()
  const categoryBody = await categoryResponse.json()

  const name = `Produk Riwayat ${suffix}`
  const productResponse = await api.post(`${API_URL}/products`, {
    headers,
    data: {
      sku: `RIW-${suffix}`,
      name,
      category_id: categoryBody.data.id,
      unit: 'pcs',
      cost_price: 2000,
      selling_price: 3500,
      stock: 5,
      min_stock: 0,
    },
  })
  expect(productResponse.ok()).toBeTruthy()
  const productBody = await productResponse.json()

  return { id: productBody.data.id as string, name }
}

const checkout = async (
  api: APIRequestContext,
  token: string,
  productId: string,
): Promise<{ id: string; invoice_number: string }> => {
  const response = await api.post(`${API_URL}/transactions`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Idempotency-Key': crypto.randomUUID(),
    },
    data: {
      items: [{ product_id: productId, quantity: 1 }],
      payment: { method: 'CASH', amount_paid: 5000 },
    },
  })
  expect(response.status()).toBe(201)

  const body = await response.json()
  return body.data as { id: string; invoice_number: string }
}

test.describe('riwayat transaksi', () => {
  test('Admin mencari transaksi dan membuka detail snapshot', async ({ page, request }) => {
    const adminToken = await apiLogin(request, 'admin@pos.local', 'Admin@12345')
    const cashierToken = await apiLogin(request, 'kasir1@pos.local', 'Kasir@12345')
    const suffix = uniqueSuffix()
    const product = await createProduct(request, adminToken, suffix)
    const transaction = await checkout(request, cashierToken, product.id)

    await login(page, 'admin@pos.local', 'Admin@12345')
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.goto('/transactions')
    await expect(
      page.getByRole('main').getByRole('heading', { name: 'Riwayat Transaksi', level: 1 }),
    ).toBeVisible()

    await page.getByLabel('Cari invoice').fill(transaction.invoice_number)
    await page.getByRole('button', { name: 'Terapkan' }).click()

    const row = page.getByRole('row', { name: new RegExp(transaction.invoice_number) })
    await expect(row).toBeVisible()
    await expect(row).toContainText('Siti Rahma')
    await expect(row).toContainText('Selesai')

    await row.click()

    await expect(page).toHaveURL(new RegExp(`/transactions/${transaction.id}$`))
    await expect(
      page.getByRole('heading', { name: transaction.invoice_number, level: 1 }),
    ).toBeVisible()
    await expect(page.getByText(product.name)).toBeVisible()
    await expect(page.getByText('Modal', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cetak Ulang' })).toBeVisible()
  })

  test('Kasir hanya melihat transaksinya dan tidak dapat membuka transaksi kasir lain', async ({
    page,
    request,
  }) => {
    const adminToken = await apiLogin(request, 'admin@pos.local', 'Admin@12345')
    const cashierToken = await apiLogin(request, 'kasir1@pos.local', 'Kasir@12345')
    const otherCashierToken = await apiLogin(request, 'kasir2@pos.local', 'Kasir@12345')
    const suffix = uniqueSuffix()
    const product = await createProduct(request, adminToken, suffix)
    const own = await checkout(request, cashierToken, product.id)
    const other = await checkout(request, otherCashierToken, product.id)

    await login(page, 'kasir1@pos.local', 'Kasir@12345')
    await expect(page).toHaveURL(/\/pos$/)

    await page.goto('/transactions')
    await expect(page.getByText('Hanya transaksi Anda')).toBeVisible()
    await expect(page.getByLabel('Kasir')).toHaveCount(0)

    await page.getByLabel('Cari invoice').fill(own.invoice_number)
    await page.getByRole('button', { name: 'Terapkan' }).click()
    await expect(page.getByRole('row', { name: new RegExp(own.invoice_number) })).toBeVisible()

    await page.getByLabel('Cari invoice').fill(other.invoice_number)
    await page.getByRole('button', { name: 'Terapkan' }).click()
    await expect(page.getByText('Tidak ada transaksi untuk filter ini')).toBeVisible()

    await page.goto(`/transactions/${other.id}`)
    await expect(page.getByText('Transaksi tidak ditemukan')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Kembali ke riwayat' }).first()).toBeVisible()
  })
})
