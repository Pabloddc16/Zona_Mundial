import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Auth', () => {
  test('shows login page at /login', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Sign in')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
  })

  test('redirects unauthenticated to /login', async ({ page }) => {
    await page.goto('/')
    await page.waitForURL('/login')
  })

  test('shows error on wrong credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('wrong@example.com')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText(/invalid|unauthorized/i)).toBeVisible({ timeout: 5000 })
  })

  test('logs in with valid credentials and lands on dashboard', async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL('/')
    await expect(page.getByText('Total revenue')).toBeVisible({ timeout: 8000 })
  })
})
