import { Page } from '@playwright/test'

export const ADMIN_EMAIL = 'admin@admin.com'
export const ADMIN_PASSWORD = 'admin1234'
export const BASE = 'http://localhost:3001'

export async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(ADMIN_EMAIL)
  await page.getByLabel('Password').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('/')
}
