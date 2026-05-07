import { test, expect } from '@playwright/test'

// Intercept POST /api/orders and return a mock order
async function mockOrderCreate(page: import('@playwright/test').Page) {
  await page.route('**/api/orders', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          order_number: 'TEST-001',
          customer_name: 'Ana Torres',
          phone: '5512345678',
          address: 'Calle Falsa 123',
          status: 'pendiente',
          total: 145,
          subtotal: 25,
          shipping: 120,
          payment_method: 'Efectivo',
          delivery_type: 'envio',
          date: new Date().toISOString(),
          order_items: [{ name: 'Sobre individual', qty: 1, price: 25 }],
        }),
      })
    } else {
      await route.continue()
    }
  })
}

async function mockOrderGet(page: import('@playwright/test').Page, orderNumber: string) {
  await page.route(`**/api/orders/${orderNumber}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        order_number: orderNumber,
        customer_name: 'Ana Torres',
        phone: '5512345678',
        address: 'Calle Falsa 123',
        status: 'pendiente',
        total: 145,
        subtotal: 25,
        shipping: 120,
        payment_method: 'Efectivo',
        delivery_type: 'envio',
        date: new Date().toISOString(),
        order_items: [{ name: 'Sobre individual', qty: 1, price: 25 }],
      }),
    })
  })
}

test.describe('Checkout flow — golden path', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('pablo-cart-v1')
    })
  })

  test('full flow: add to cart → checkout → confirmation', async ({ page }) => {
    await mockOrderCreate(page)
    await mockOrderGet(page, 'TEST-001')

    // Add product
    await page.goto('/tienda/SOBRE-1')
    await page.getByRole('button', { name: /Agregar/ }).click()

    // Go to cart
    await page.goto('/carrito')
    await expect(page.getByText('Sobre individual')).toBeVisible()
    await page.getByRole('link', { name: 'Continuar pedido' }).click()

    // Fill checkout form
    await expect(page).toHaveURL('/checkout')
    await page.getByPlaceholder('Juan García').fill('Ana Torres')
    await page.getByPlaceholder('55 1234 5678').fill('5512345678')
    await page.getByPlaceholder(/Calle/).fill('Calle Falsa 123')

    // Submit
    await page.getByRole('button', { name: /Confirmar/ }).click()

    // Should land on confirmation page
    await expect(page).toHaveURL('/orden/TEST-001')
    await expect(page.getByText('¡Pedido confirmado!')).toBeVisible()
    await expect(page.getByText('#TEST-001')).toBeVisible()
  })

  test('shows validation error when name missing', async ({ page }) => {
    await page.goto('/tienda/SOBRE-1')
    await page.getByRole('button', { name: /Agregar/ }).click()
    await page.goto('/checkout')

    // Submit without filling name
    await page.getByRole('button', { name: /Confirmar/ }).click()

    await expect(page.getByText('Nombre y teléfono requeridos')).toBeVisible()
  })

  test('shows validation error when address missing for envio', async ({ page }) => {
    await page.goto('/tienda/SOBRE-1')
    await page.getByRole('button', { name: /Agregar/ }).click()
    await page.goto('/checkout')

    await page.getByPlaceholder('Juan García').fill('Test User')
    await page.getByPlaceholder('55 1234 5678').fill('5500000000')
    // Leave address empty, delivery type defaults to envio

    await page.getByRole('button', { name: /Confirmar/ }).click()
    await expect(page.getByText('Dirección requerida para envío')).toBeVisible()
  })

  test('recoger en tienda does not require address', async ({ page }) => {
    await mockOrderCreate(page)
    await mockOrderGet(page, 'TEST-001')

    await page.goto('/tienda/SOBRE-1')
    await page.getByRole('button', { name: /Agregar/ }).click()
    await page.goto('/checkout')

    // Switch to local pickup
    await page.getByRole('button', { name: /Recoger en tienda/ }).click()

    await page.getByPlaceholder('Juan García').fill('Ana Torres')
    await page.getByPlaceholder('55 1234 5678').fill('5512345678')

    // Submit without address — should work
    await page.getByRole('button', { name: /Confirmar/ }).click()
    await expect(page).toHaveURL('/orden/TEST-001')
  })
})

test.describe('Order confirmation page', () => {
  test('shows order details after confirmation', async ({ page }) => {
    await mockOrderGet(page, 'TEST-001')
    await page.goto('/orden/TEST-001')

    await expect(page.getByText('¡Pedido confirmado!')).toBeVisible()
    await expect(page.getByText('Ana Torres')).toBeVisible()
    await expect(page.getByText('Pendiente')).toBeVisible()
    await expect(page.getByText('$145')).toBeVisible()
  })
})
