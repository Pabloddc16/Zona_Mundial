import { test, expect } from '@playwright/test';

async function bootClean(page) {
  await page.addInitScript(() => {
    try { localStorage.clear(); } catch (_) {}
  });
  await page.goto('/');
  await page.waitForFunction(() => !!window.S && !!document.querySelector('.nav'));
  await page.evaluate(() => window.reset('album'));
  await page.waitForSelector('.circle-stk');
}

test.describe('Flujo agregar sticker', () => {
  test('home → álbum → tap MEX01 → contador = 1', async ({ page }) => {
    await bootClean(page);

    // Estado inicial: MEX01 no tiene owned
    const before = await page.evaluate(() => (window.S.album['TEAM-MEX'] || {})[1]);
    expect(before === undefined || before.owned === 0).toBe(true);

    // Tap en MEX01 (data-stk="TEAM-MEX-1")
    await page.locator('[data-stk="TEAM-MEX-1"]').first().click();

    // Contador interno = 1
    await expect.poll(async () =>
      page.evaluate(() => (window.S.album['TEAM-MEX'] || {})[1]?.owned)
    ).toBe(1);

    // El sticker debe quedar visualmente "owned"
    await expect(page.locator('[data-stk="TEAM-MEX-1"]').first()).toHaveClass(/owned/);
  });
});
