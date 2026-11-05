import { expect, test, type Page } from '@playwright/test'

const login = async (page: Page, email: string, password: string) => {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()
}

const uniqueSuffix = () => Date.now().toString().slice(-6)

test.describe('master data', () => {
  test('Admin membuat kategori, produk, lalu mengubah produk', async ({ page }) => {
    const suffix = uniqueSuffix()
    const categoryName = `Kategori E2E ${suffix}`
    const productName = `Produk E2E ${suffix}`
    const updatedProductName = `${productName} Update`

    await login(page, 'admin@pos.local', 'Admin@12345')
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.getByRole('link', { name: 'Kategori' }).click()
    await expect(page).toHaveURL(/\/categories$/)

    await page.getByRole('button', { name: 'Tambah Kategori' }).first().click()
    const categoryDialog = page.getByRole('dialog')
    await categoryDialog.getByLabel('Nama kategori').fill(categoryName)
    await categoryDialog.getByLabel('Deskripsi').fill('Kategori untuk pengujian e2e')
    await categoryDialog.getByRole('button', { name: 'Simpan' }).click()

    await expect(page.getByText('Kategori berhasil dibuat')).toBeVisible()
    await page.getByLabel('Cari kategori').fill(categoryName)
    await expect(page.getByRole('cell', { name: categoryName })).toBeVisible()

    await page.getByRole('link', { name: 'Produk' }).click()
    await expect(page).toHaveURL(/\/products$/)

    await page.getByRole('button', { name: 'Tambah Produk' }).first().click()
    const productDialog = page.getByRole('dialog')
    await productDialog.getByLabel('SKU').fill(`E2E-${suffix}`)
    await productDialog.getByLabel('Nama produk').fill(productName)
    await productDialog.getByLabel('Kategori').selectOption({ label: categoryName })
    await productDialog.getByLabel('Satuan').fill('pcs')
    await productDialog.getByLabel('Harga modal').fill('3000')
    await productDialog.getByLabel('Harga jual').fill('5000')
    await productDialog.getByLabel('Stok awal').fill('10')
    await productDialog.getByLabel('Stok minimum').fill('2')
    await productDialog.getByRole('button', { name: 'Simpan' }).click()

    await expect(page.getByText('Produk berhasil dibuat')).toBeVisible()
    await page.getByLabel('Cari produk').fill(productName)
    await expect(page.getByRole('cell', { name: productName })).toBeVisible()

    const productRow = page.getByRole('row', { name: new RegExp(productName) })
    await productRow.getByRole('button', { name: 'Ubah' }).click()

    const editDialog = page.getByRole('dialog')
    await editDialog.getByLabel('Nama produk').fill(updatedProductName)
    await editDialog.getByRole('button', { name: 'Simpan' }).click()

    await expect(page.getByText('Produk berhasil diperbarui')).toBeVisible()
    await expect(
      page.getByRole('row', { name: new RegExp(updatedProductName) }),
    ).toBeVisible()
  })

  test('Kasir tidak melihat aksi tulis pada halaman produk', async ({ page }) => {
    await login(page, 'kasir1@pos.local', 'Kasir@12345')
    await expect(page).toHaveURL(/\/pos$/)

    await page.goto('/products')
    await expect(page).toHaveURL(/\/products$/)
    await expect(page.getByText('Kelola katalog produk, harga, dan status aktif.')).toBeVisible()

    await expect(page.getByRole('button', { name: 'Tambah Produk' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Ubah' })).toHaveCount(0)
  })
})