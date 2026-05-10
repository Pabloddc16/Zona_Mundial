import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Users CRUD', () => {
  const USERNAME = `e2euser${Date.now()}`

  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/users')
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  })

  test('lists users table', async ({ page }) => {
    await expect(page.getByRole('table')).toBeVisible({ timeout: 8000 })
    await expect(page.getByText('admin')).toBeVisible()
  })

  test('creates a user', async ({ page }) => {
    await page.getByRole('button', { name: /new user/i }).click()
    await expect(page.getByText('New user')).toBeVisible()

    await page.getByLabel('Username').fill(USERNAME)
    await page.getByLabel('Email').fill(`${USERNAME}@test.com`)
    await page.getByLabel(/password/i).fill('testpass1234')
    await page.getByRole('button', { name: /create user/i }).click()

    await expect(page.getByText(USERNAME)).toBeVisible({ timeout: 8000 })
  })

  test('edits user role', async ({ page }) => {
    const row = page.locator('tr', { hasText: USERNAME })
    await row.getByRole('button', { name: 'Edit' }).click()

    await page.getByLabel('Role').selectOption('capturista')
    await page.getByRole('button', { name: /save/i }).click()

    await expect(page.getByText(USERNAME)).toBeVisible({ timeout: 8000 })
  })

  test('deletes a user', async ({ page }) => {
    const row = page.locator('tr', { hasText: USERNAME })
    page.on('dialog', (d) => d.accept())
    await row.getByRole('button').last().click()
    await expect(page.locator('tr', { hasText: USERNAME })).not.toBeVisible({ timeout: 8000 })
  })
})
