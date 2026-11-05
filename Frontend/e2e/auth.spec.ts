import { expect, test, type Page } from '@playwright/test'

const login = async (page: Page, email: string, password: string) => {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: 'Masuk' }).click()
}

test.describe('autentikasi', () => {
  test('Cashier diarahkan ke /pos', async ({ page }) => {
    await login(page, 'kasir1@pos.local', 'Kasir@12345')

    await expect(page).toHaveURL(/\/pos$/)
  })

  test('Admin diarahkan ke /dashboard', async ({ page }) => {
    await login(page, 'admin@pos.local', 'Admin@12345')

    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('kredensial salah menampilkan pesan generik', async ({ page }) => {
    await login(page, 'kasir1@pos.local', 'password-salah')

    await expect(page.getByRole('alert')).toContainText('Email atau password salah')
    await expect(page).toHaveURL(/\/login/)
  })

  test('Cashier membuka /users diarahkan ke /403', async ({ page }) => {
    await login(page, 'kasir1@pos.local', 'Kasir@12345')
    await expect(page).toHaveURL(/\/pos$/)

    await page.goto('/users')

    await expect(page).toHaveURL(/\/403$/)
  })

  test('token tidak valid memaksa kembali ke /login', async ({ page }) => {
    await login(page, 'kasir1@pos.local', 'Kasir@12345')
    await expect(page).toHaveURL(/\/pos$/)

    await page.evaluate(() => localStorage.setItem('pos.access_token', 'token-rusak'))
    await page.goto('/pos')

    await expect(page).toHaveURL(/\/login/)
  })
})
