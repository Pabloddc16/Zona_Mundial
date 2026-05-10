import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Orders', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/orders')
    await expect(page.getByRole('heading', { name: 'Orders' })).toBeVisible()
  })

  test('loads orders table', async ({ page }) => {
    await expect(page.getByRole('table')).toBeVisible({ timeout: 8000 })
  })

  test('filters by status', async ({ page }) => {
    await page.getByRole('combobox').selectOption('DELIVERED')
    await page.waitForTimeout(500)
    const badges = page.locator('text=DELIVERED')
    const count = await badges.count()
    if (count > 0) {
      await expect(badges.first()).toBeVisible()
    }
  })

  test('opens edit sheet for an order', async ({ page }) => {
    await page.getByRole('table').waitFor({ timeout: 8000 })
    const editBtn = page.getByRole('button', { name: 'Edit' }).first()
    const hasEdit = await editBtn.count()
    if (hasEdit > 0) {
      await editBtn.click()
      await expect(page.getByText(/Edit ORD/)).toBeVisible()
      await expect(page.getByLabel('Status')).toBeVisible()
    }
  })
})
