import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Products CRUD', () => {
  const NAME = `Test Product ${Date.now()}`

  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/products')
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible()
  })

  test('lists products table', async ({ page }) => {
    await expect(page.getByRole('table')).toBeVisible({ timeout: 8000 })
  })

  test('creates a product', async ({ page }) => {
    await page.getByRole('button', { name: /new product/i }).click()
    await expect(page.getByText('New product')).toBeVisible()

    await page.getByLabel('Name *').fill(NAME)
    await page.getByLabel(/price/i).fill('99.99')
    await page.getByRole('button', { name: /save|create/i }).click()

    await expect(page.getByText(NAME)).toBeVisible({ timeout: 8000 })
  })

  test('edits a product', async ({ page }) => {
    await page.getByText(NAME).waitFor({ timeout: 8000 })
    const row = page.locator('tr', { hasText: NAME })
    await row.getByRole('button', { name: 'Edit' }).click()

    await page.getByLabel('Name *').fill(NAME + ' (edited)')
    await page.getByRole('button', { name: /save/i }).click()

    await expect(page.getByText(NAME + ' (edited)')).toBeVisible({ timeout: 8000 })
  })

  test('deletes a product', async ({ page }) => {
    await page.getByText(NAME + ' (edited)').waitFor({ timeout: 8000 })
    const row = page.locator('tr', { hasText: NAME + ' (edited)' })

    page.on('dialog', (d) => d.accept())
    await row.getByRole('button', { name: 'Delete' }).click()

    await expect(page.getByText(NAME + ' (edited)')).not.toBeVisible({ timeout: 8000 })
  })
})
