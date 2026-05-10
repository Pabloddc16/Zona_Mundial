import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Customers CRUD', () => {
  const NAME = `E2E Customer ${Date.now()}`

  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/customers')
    await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible()
  })

  test('lists customers with search', async ({ page }) => {
    await expect(page.getByPlaceholder(/search/i)).toBeVisible()
    await expect(page.getByRole('table')).toBeVisible({ timeout: 8000 })
  })

  test('creates a customer', async ({ page }) => {
    await page.getByRole('button', { name: /new customer/i }).click()
    await expect(page.getByText('New customer')).toBeVisible()

    await page.getByLabel('Name *').fill(NAME)
    await page.getByLabel('Phone').fill('+525512345678')
    await page.getByLabel('Email').fill('e2e@test.com')
    await page.getByRole('button', { name: /save/i }).click()

    await expect(page.getByText(NAME)).toBeVisible({ timeout: 8000 })
  })

  test('searches for customer', async ({ page }) => {
    await page.getByPlaceholder(/search/i).fill(NAME)
    await expect(page.getByText(NAME)).toBeVisible()
  })

  test('edits a customer', async ({ page }) => {
    await page.getByPlaceholder(/search/i).fill(NAME)
    const row = page.locator('tr', { hasText: NAME })
    await row.getByRole('button', { name: 'Edit' }).click()

    await page.getByLabel('Name *').fill(NAME + ' edited')
    await page.getByRole('button', { name: /save/i }).click()

    await expect(page.getByText(NAME + ' edited')).toBeVisible({ timeout: 8000 })
  })

  test('deletes a customer', async ({ page }) => {
    await page.getByPlaceholder(/search/i).fill(NAME + ' edited')
    const row = page.locator('tr', { hasText: NAME + ' edited' })

    page.on('dialog', (d) => d.accept())
    await row.getByRole('button').filter({ hasText: '' }).last().click()

    await expect(page.getByText(NAME + ' edited')).not.toBeVisible({ timeout: 8000 })
  })
})
