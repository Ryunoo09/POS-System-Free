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

/**
 * Kasir wajib membuka shift sebelum bisa berjualan. Modal "Buka Shift Kasir"
 * menutupi seluruh layar, jadi harus diselesaikan dulu agar elemen lain bisa diklik.
 */
const openShiftIfNeeded = async (page: Page) => {
  const openShiftModal = page.getByRole('dialog', { name: 'Buka Shift Kasir' })

  // Modal bisa muncul terlambat (menunggu fetchCurrentShift), jadi tunggu sebentar.
  const appeared = await openShiftModal
    .waitFor({ state: 'visible', timeout: 5000 })
    .then(() => true)
    .catch(() => false)

  if (!appeared) return

  await openShiftModal.getByLabel('Modal Awal (Rp)').fill('50000')
  await openShiftModal.getByRole('button', { name: 'Buka Shift Sekarang' }).click()
  await expect(openShiftModal).toBeHidden()
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
  options: { stock?: number; barcode?: string; sellingPrice?: number } = {},
) => {
  const headers = { Authorization: `Bearer ${token}` }
  const categoryResponse = await api.post(`${API_URL}/categories`, {
    headers,
    data: { name: `Kategori POS ${suffix}` },
  })
  expect(categoryResponse.ok()).toBeTruthy()
  const categoryBody = await categoryResponse.json()

  const name = `Produk POS ${suffix}`
  const sku = `POS-${suffix}`
  const barcode = options.barcode ?? null

  const payload: Record<string, unknown> = {
    sku,
    name,
    category_id: categoryBody.data.id,
    unit: 'pcs',
    cost_price: 2000,
    selling_price: options.sellingPrice ?? 3500,
    stock: options.stock ?? 5,
    min_stock: 0,
  }

  if (barcode) payload.barcode = barcode

  const productResponse = await api.post(`${API_URL}/products`, {
    headers,
    data: payload,
  })
  expect(productResponse.ok()).toBeTruthy()
  const productBody = await productResponse.json()

  return {
    id: productBody.data.id as string,
    name,
    sku,
    barcode,
  }
}

const adjustStock = async (
  api: APIRequestContext,
  token: string,
  productId: string,
  quantity: number,
) => {
  const response = await api.post(`${API_URL}/inventory/adjustments`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      product_id: productId,
      movement_type: 'ADJUSTMENT',
      quantity,
      notes: 'Penyesuaian e2e POS',
    },
  })
  expect(response.ok()).toBeTruthy()
}

const productCard = (page: Page, name: string) =>
  page.getByRole('button', { name: `Tambah ${name} ke keranjang` })

test.describe('pos', () => {
  test('kasir mencari produk, checkout tunai, dan melihat struk', async ({
    page,
    request,
  }) => {
    const adminToken = await apiLogin(request, 'admin@pos.local', 'Admin@12345')
    const suffix = uniqueSuffix()
    const product = await createProduct(request, adminToken, suffix, { stock: 5 })

    await login(page, 'kasir1@pos.local', 'Kasir@12345')
    await openShiftIfNeeded(page)
    await expect(page).toHaveURL(/\/pos$/)

    await page.getByLabel('Cari produk').fill(product.sku)

    const card = productCard(page, product.name)
    await expect(card).toBeVisible()
    await expect(card).toContainText('Stok 5')
    await card.click()

    await expect(page.getByRole('spinbutton', { name: `Jumlah ${product.name}` })).toHaveValue('1')
    await expect(page.getByText('Rp 3.500').first()).toBeVisible()

    await page.getByLabel('Jumlah dibayar').fill('20000')
    await expect(page.getByText('Rp 16.500')).toBeVisible()

    await page.getByRole('button', { name: 'Checkout' }).click()

    const dialog = page.getByRole('dialog', { name: 'Transaksi berhasil' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(/INV-\d{8}-\d{6}/)
    await expect(dialog).toContainText('Rp 3.500')
    await expect(dialog).toContainText('Rp 16.500')
    await expect(dialog).toContainText(product.name)

    await dialog.getByRole('button', { name: 'Transaksi Baru' }).click()
    await expect(dialog).toBeHidden()

    await expect(card).toContainText('Stok 4')
  })

  test('barcode menambahkan produk ke keranjang', async ({ page, request }) => {
    const adminToken = await apiLogin(request, 'admin@pos.local', 'Admin@12345')
    const suffix = uniqueSuffix()
    const barcode = `899${suffix.slice(-9)}`
    const product = await createProduct(request, adminToken, suffix, {
      stock: 3,
      barcode,
    })

    await login(page, 'kasir1@pos.local', 'Kasir@12345')
    await openShiftIfNeeded(page)
    await expect(page).toHaveURL(/\/pos$/)

    await page.getByLabel('Barcode').fill(barcode)
    await page.getByLabel('Barcode').press('Enter')

    await expect(page.getByRole('spinbutton', { name: `Jumlah ${product.name}` })).toHaveValue('1')
    await expect(page.getByText(`${product.name} ditambahkan.`)).toBeVisible()
  })

  test('checkout gagal karena stok berubah tetap mempertahankan keranjang', async ({
    page,
    request,
  }) => {
    const adminToken = await apiLogin(request, 'admin@pos.local', 'Admin@12345')
    const suffix = uniqueSuffix()
    const product = await createProduct(request, adminToken, suffix, { stock: 1 })

    await login(page, 'kasir1@pos.local', 'Kasir@12345')
    await openShiftIfNeeded(page)
    await expect(page).toHaveURL(/\/pos$/)

    await page.getByLabel('Cari produk').fill(product.sku)
    const card = productCard(page, product.name)
    await expect(card).toBeVisible()
    await card.click()

    await adjustStock(request, adminToken, product.id, -1)

    await page.getByLabel('Jumlah dibayar').fill('3500')
    await page.getByRole('button', { name: 'Checkout' }).click()

    await expect(page.getByText(/diminta 1, tersedia 0/).first()).toBeVisible()
    await expect(page.getByRole('dialog', { name: 'Transaksi berhasil' })).toBeHidden()
    await expect(page.getByRole('spinbutton', { name: `Jumlah ${product.name}` })).toHaveValue('1')
  })
})
