import { expect, test, type Page } from '@playwright/test'

const login = async (page: Page, email: string, password: string) => {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()
}

const cardValue = (page: Page, label: string): Promise<string> =>
  page
    .locator('article', { hasText: label })
    .first()
    .locator('p')
    .nth(1)
    .innerText()

test.describe('laporan', () => {
  test('Admin membuka laporan dan berpindah tab', async ({ page }) => {
    await login(page, 'admin@pos.local', 'Admin@12345')
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.getByRole('link', { name: 'Laporan' }).click()
    await expect(page).toHaveURL(/\/reports$/)
    await expect(
      page.getByRole('main').getByRole('heading', { name: 'Laporan', level: 1 }),
    ).toBeVisible()

    for (const label of ['Revenue', 'COGS', 'Estimasi Gross Profit', 'Transaksi']) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible()
    }

    await expect(page.getByRole('columnheader', { name: 'Periode' })).toBeVisible()

    await page.getByRole('button', { name: 'Per Produk' }).click()
    await expect(page.getByLabel('Urutkan')).toBeVisible()
    await expect(page.getByLabel('Kategori')).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Produk' })).toBeVisible()

    await page.getByRole('button', { name: 'Per Kasir' }).click()
    await expect(page.getByRole('columnheader', { name: 'Kasir' })).toBeVisible()
  })

  test('Angka laporan identik dengan dashboard untuk rentang yang sama', async ({ page }) => {
    await login(page, 'admin@pos.local', 'Admin@12345')
    await expect(page).toHaveURL(/\/dashboard$/)

    // Tunggu kartu ringkasan selesai dimuat (nilai bukan nol) sebelum dibaca.
    await expect.poll(async () => cardValue(page, 'Penjualan')).not.toBe('Rp 0')
    const dashboardRevenue = await cardValue(page, 'Penjualan')

    await page.getByRole('link', { name: 'Laporan' }).click()
    await expect(page).toHaveURL(/\/reports$/)

    await page.getByLabel('Periode').selectOption('today')

    await expect.poll(async () => cardValue(page, 'Revenue')).toBe(dashboardRevenue)
  })

  test('Kasir tidak dapat membuka laporan', async ({ page }) => {
    await login(page, 'kasir1@pos.local', 'Kasir@12345')
    await expect(page).toHaveURL(/\/pos$/)

    await page.goto('/reports')

    await expect(page).toHaveURL(/\/403$/)
  })
})
