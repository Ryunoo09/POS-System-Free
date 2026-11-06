import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test'

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
  stock: number,
  minStock: number,
) => {
  const headers = { Authorization: `Bearer ${token}` }
  const categoryResponse = await api.post(`${API_URL}/categories`, {
    headers,
    data: { name: `Kategori INV ${suffix}` },
  })
  expect(categoryResponse.ok()).toBeTruthy()
  const categoryBody = await categoryResponse.json()

  const name = `Produk INV ${suffix}`
  const sku = `INV-${suffix}`

  const productResponse = await api.post(`${API_URL}/products`, {
    headers,
    data: {
      sku,
      name,
      category_id: categoryBody.data.id,
      unit: 'pcs',
      cost_price: 1000,
      selling_price: 1500,
      stock,
      min_stock: minStock,
    },
  })
  expect(productResponse.ok()).toBeTruthy()
  const productBody = await productResponse.json()

  return { id: productBody.data.id as string, name, sku }
}

const searchProduct = async (page: Page, sku: string) => {
  await page.getByLabel('Cari produk').fill(sku)
  return page.getByRole('row', { name: new RegExp(sku) })
}

test.describe('inventory', () => {
  test('Admin menambah stok, mengurangi stok, dan melihat riwayat', async ({ page, request }) => {
    const token = await apiLogin(request, 'admin@pos.local', 'Admin@12345')
    const suffix = uniqueSuffix()
    const product = await createProduct(request, token, suffix, 5, 5)

    await login(page, 'admin@pos.local', 'Admin@12345')
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.getByRole('link', { name: 'Inventori' }).click()
    await expect(page).toHaveURL(/\/inventory$/)
    await expect(
      page.getByRole('main').getByRole('heading', { name: 'Inventori', level: 1 }),
    ).toBeVisible()

    const row = await searchProduct(page, product.sku)
    await expect(row).toBeVisible()
    await expect(row.locator('td').nth(2)).toContainText('5')

    await row.getByRole('button', { name: 'Tambah Stok' }).click()
    const purchaseDialog = page.getByRole('dialog', { name: 'Tambah Stok' })
    await purchaseDialog.getByLabel('Jumlah Masuk').fill('7')
    await purchaseDialog.getByLabel('Catatan (opsional)').fill('Pembelian supplier')
    await purchaseDialog.getByRole('button', { name: 'Tambah Stok' }).click()

    await expect(page.getByText('Stok berhasil ditambah')).toBeVisible()
    await expect(row.locator('td').nth(2)).toContainText('12')

    await row.getByRole('button', { name: 'Penyesuaian' }).click()
    const adjustmentDialog = page.getByRole('dialog', { name: 'Penyesuaian Stok' })
    await adjustmentDialog.getByLabel('Jumlah Penyesuaian').fill('-2')
    await adjustmentDialog.getByLabel('Alasan').fill('Barang rusak')
    await adjustmentDialog.getByRole('button', { name: 'Simpan Penyesuaian' }).click()

    const confirmDialog = page.getByRole('dialog', { name: 'Kurangi stok?' })
    await expect(confirmDialog).toContainText('dari 12 menjadi 10')
    await confirmDialog.getByRole('button', { name: 'Ya, kurangi' }).click()

    await expect(page.getByText('Stok berhasil disesuaikan')).toBeVisible()
    await expect(row.locator('td').nth(2)).toContainText('10')

    await page.getByRole('tab', { name: 'Riwayat' }).click()
    await page.getByLabel('Tipe pergerakan').selectOption('PURCHASE')

    const historyRows = page.getByRole('row', { name: new RegExp(product.sku) })
    await expect(historyRows).toHaveCount(1)
    const historyRow = historyRows.first()
    await expect(historyRow.locator('td').nth(3)).toContainText('+7')
    await expect(historyRow.locator('td').nth(4)).toContainText('5 → 12')
  })

  test('Owner hanya dapat melihat stok dan stok rendah', async ({ page, request }) => {
    const token = await apiLogin(request, 'admin@pos.local', 'Admin@12345')
    const suffix = uniqueSuffix()
    const product = await createProduct(request, token, suffix, 0, 0)

    await login(page, 'owner@pos.local', 'Owner@12345')
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.goto('/inventory')
    await expect(page.getByText('Hanya lihat')).toBeVisible()

    const row = await searchProduct(page, product.sku)
    await expect(row).toBeVisible()
    await expect(row.getByRole('button')).toHaveCount(0)

    await page.getByRole('tab', { name: 'Stok Rendah' }).click()
    await expect(page.getByRole('row', { name: new RegExp(product.sku) })).toBeVisible()
    await expect(page.getByRole('row', { name: new RegExp(product.sku) })).toContainText('Rendah')
  })

  test('Kasir tidak dapat membuka inventori', async ({ page }) => {
    await login(page, 'kasir1@pos.local', 'Kasir@12345')
    await expect(page).toHaveURL(/\/pos$/)

    await page.goto('/inventory')
    await expect(page).toHaveURL(/\/403$/)
  })
})