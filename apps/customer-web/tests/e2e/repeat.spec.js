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

test.describe('Flujo marcar repetido', () => {
  test('owned=3 → badge "2" (duplicates = owned − 1) visible', async ({ page }) => {
    await bootClean(page);

    // Subir el contador a 3 vía stickerStep (lo que hace el modal stepper)
    await page.evaluate(() => {
      window.stickerStep('TEAM-MEX', 1, 1);
      window.stickerStep('TEAM-MEX', 1, 1);
      window.stickerStep('TEAM-MEX', 1, 1);
    });

    // Estado interno = 3
    await expect.poll(async () =>
      page.evaluate(() => window.S.album['TEAM-MEX'][1].owned)
    ).toBe(3);

    // Badge .dupx muestra el count de duplicados (owned − 1) = 2.
    const badge = page.locator('[data-stk="TEAM-MEX-1"] .dupx').first();
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText('2');

    // Aparece en la subtab "Repetidas"
    await page.evaluate(() => { window.S.ui.albumSub = 'repetidas'; window.render(); });
    await expect(page.locator('[data-stk="TEAM-MEX-1"]').first()).toBeVisible();
  });
});
