import { test, expect } from '@playwright/test';

async function bootClean(page) {
  await page.addInitScript(() => {
    try { localStorage.clear(); } catch (_) {}
  });
  await page.goto('/');
  await page.waitForFunction(() => !!window.S && !!document.querySelector('.nav'));
}

test.describe('Flujo comprar', () => {
  test('tienda → SOBRE-1 → carrito → checkout', async ({ page }) => {
    await bootClean(page);

    // Ir a Tienda
    await page.evaluate(() => window.reset('tienda'));
    await page.waitForSelector('.prods');

    // Agregar SOBRE-1 al carrito (cualquiera de los onclick=cartAdd('SOBRE-1'))
    await page.evaluate(() => window.cartAdd('SOBRE-1'));
    await expect.poll(async () =>
      page.evaluate(() => window.S.cart['SOBRE-1'])
    ).toBe(1);

    // Cart badge visible con el conteo
    await expect(page.locator('.cart-badge').first()).toBeVisible();

    // Ir al carrito
    await page.evaluate(() => window.go('carrito'));
    await expect.poll(async () =>
      page.evaluate(() => window.S.screen)
    ).toBe('carrito');

    // El item del carrito debe aparecer
    await expect(page.locator('.cart-item').first()).toBeVisible();

    // Continuar a checkout
    await page.evaluate(() => window.go('checkout'));
    await expect.poll(async () =>
      page.evaluate(() => window.S.screen)
    ).toBe('checkout');

    // Checkout llegó: tiene un botón "Pagar" en el footer
    await expect(page.getByRole('button', { name: /Pagar/i })).toBeVisible();
  });
});
