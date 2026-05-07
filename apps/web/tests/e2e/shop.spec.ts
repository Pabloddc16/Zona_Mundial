import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('pablo-album-v1')
    localStorage.removeItem('pablo-cart-v1')
  })
})

test.describe('Shop — catalog and cart', () => {
  test('shows all products by default', async ({ page }) => {
    await page.goto('/tienda')
    await expect(page.getByRole('heading', { name: 'Tienda' })).toBeVisible()

    // At least one product visible
    await expect(page.getByText('Sobre individual')).toBeVisible()
  })

  test('category filter narrows products', async ({ page }) => {
    await page.goto('/tienda')

    // Click "Jerseys" category
    await page.getByRole('button', { name: 'Jerseys' }).click()

    // Only jersey products
    await expect(page.getByText('Jersey México Local 26')).toBeVisible()
    await expect(page.getByText('Sobre individual')).not.toBeVisible()
  })

  test('add to cart shows cart badge', async ({ page }) => {
    await page.goto('/tienda')

    // Quick-add SOBRE-1
    const sobreCard = page.locator('[href="/tienda/SOBRE-1"]').first().locator('..')
    await sobreCard.locator('button').click()

    // Cart badge in nav shows 1
    const badge = page.locator('text=1').filter({ has: page.locator('[class*="rounded-full"]') }).first()
    await expect(badge).toBeVisible({ timeout: 3000 })
  })

  test('product detail page loads', async ({ page }) => {
    await page.goto('/tienda/SOBRE-1')

    await expect(page.getByRole('heading', { name: 'Sobre individual' })).toBeVisible()
    await expect(page.getByText('$25')).toBeVisible()
    await expect(page.getByRole('button', { name: /Agregar/ })).toBeVisible()
  })

  test('product detail qty selector works', async ({ page }) => {
    await page.goto('/tienda/SOBRE-1')

    // Default qty = 1
    const plusBtn = page.locator('button', { hasText: '+' })
    await plusBtn.click()
    await plusBtn.click()

    // Button should now show qty 3 total (2 clicks from 1)
    await expect(page.getByRole('button', { name: /Agregar \(3\)/ })).toBeVisible()
  })
})

test.describe('Cart — manage items', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('pablo-cart-v1')
    })
  })

  test('empty cart shows empty state', async ({ page }) => {
    await page.goto('/carrito')
    await expect(page.getByText('Tu carrito está vacío')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ir a la tienda' })).toBeVisible()
  })

  test('add item then see it in cart', async ({ page }) => {
    // Add via product page
    await page.goto('/tienda/CAJA-100')
    await page.getByRole('button', { name: /Agregar/ }).click()

    // Navigate to cart
    await page.goto('/carrito')
    await expect(page.getByText('Caja 100 sobres')).toBeVisible()
    await expect(page.getByText('Continuar pedido')).toBeVisible()
  })

  test('increment and decrement item qty', async ({ page }) => {
    await page.goto('/tienda/SOBRE-1')
    await page.getByRole('button', { name: /Agregar/ }).click()
    await page.goto('/carrito')

    // Increment
    await page.locator('button', { hasText: '+' }).first().click()
    await expect(page.locator('text=2').first()).toBeVisible()

    // Decrement back
    await page.locator('button', { hasText: '−' }).first().click()
    await expect(page.locator('text=1').first()).toBeVisible()
  })
})
