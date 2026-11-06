import { expect, test, type Page } from '@playwright/test'

const login = async (page: Page, email: string, password: string) => {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()
}

test.describe('dashboard', () => {
  test('Admin melihat kartu ringkasan dan seluruh widget', async ({ page }) => {
    await login(page, 'admin@pos.local', 'Admin@12345')
    await expect(page).toHaveURL(/\/dashboard$/)

    await expect(
      page.getByRole('heading', { name: 'Dashboard', level: 1 }).first(),
    ).toBeVisible()
    await expect(page.getByText('Ringkasan performa toko pada periode terpilih.')).toBeVisible()

    for (const label of ['Penjualan', 'Transaksi', 'Estimasi Profit', 'Produk', 'Stok']) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible()
    }

    for (const title of [
      'Grafik Penjualan',
      'Produk Terlaris',
      'Stok Rendah',
      'Transaksi Terbaru',
    ]) {
      await expect(page.getByRole('heading', { name: title, level: 2 })).toBeVisible()
    }

    await expect(page.getByLabel('Periode')).toBeVisible()
    await expect(page.getByLabel('Dari')).toBeVisible()
    await expect(page.getByLabel('Sampai')).toBeVisible()
  })

  test('Kasir tidak dapat membuka dashboard', async ({ page }) => {
    await login(page, 'kasir1@pos.local', 'Kasir@12345')
    await expect(page).toHaveURL(/\/pos$/)

    await page.goto('/dashboard')

    await expect(page).toHaveURL(/\/403$/)
  })
})