import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Reset Zustand persisted state before each test
    localStorage.removeItem('pablo-album-v1')
    localStorage.removeItem('pablo-cart-v1')
  })
})

test.describe('Album — sticker marking', () => {
  test('navigates to MEX group and marks sticker owned', async ({ page }) => {
    await page.goto('/album')
    await expect(page).toHaveTitle(/Pablo App/)

    // Progress bar visible
    await expect(page.locator('text=0 / 500 estampas')).toBeVisible()

    // Find MEX card and click it
    await page.getByRole('link', { name: /México/ }).first().click()
    await expect(page).toHaveURL(/\/album\/TEAM-MEX/)

    // First sticker should exist
    const firstSticker = page.locator('text=MEX01').first()
    await expect(firstSticker).toBeVisible()

    // Click "Tengo" on MEX01
    const stickerCard = page.locator('[class*="rounded-xl"]').first()
    await stickerCard.getByRole('button', { name: 'Tengo' }).click()

    // Button should now show checkmark
    await expect(stickerCard.getByRole('button', { name: '✓' })).toBeVisible()
  })

  test('filters groups by "Me falta" tab', async ({ page }) => {
    await page.goto('/album')

    // Click "Me falta" tab
    await page.getByRole('button', { name: 'Me falta' }).click()

    // All 28 groups should show (none complete)
    const cards = page.locator('a[href^="/album/"]')
    await expect(cards).toHaveCount(28)
  })

  test('filters groups by "Tengo extra" shows none when no extras', async ({ page }) => {
    await page.goto('/album')
    await page.getByRole('button', { name: 'Tengo extra' }).click()

    // No extras yet
    const cards = page.locator('a[href^="/album/"]')
    await expect(cards).toHaveCount(0)
  })

  test('"Busco" button marks needed sticker', async ({ page }) => {
    await page.goto('/album/TEAM-ARG')

    const stickerCard = page.locator('[class*="rounded-xl"]').first()
    await stickerCard.getByRole('button', { name: 'Busco' }).click()

    await expect(stickerCard.getByRole('button', { name: '★' })).toBeVisible()
  })
})
