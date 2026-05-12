import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const SCREENS = [
  { name: "home / álbum", tab: "album" },
  { name: "stats", tab: "stats" },
  { name: "tienda", tab: "tienda" },
  { name: "carrito", tab: "tienda", action: "carrito" },
  { name: "checkout", tab: "tienda", action: "checkout" },
  { name: "perfil", tab: "perfil" },
  { name: "qr", tab: "qr" },
];

async function gotoScreen(page, screen) {
  await page.goto("/");
  // Wait for app shell to render
  await page.waitForFunction(() => !!window.S && !!document.querySelector(".nav"));
  if (screen.action === "carrito") {
    // Seed cart so checkout has items
    await page.evaluate(() => {
      window.S.cart = { ...(window.S.cart || {}), "PACK-1": 2 };
      window.cartAdd && window.cartAdd("PACK-1");
      window.go("carrito");
    });
  } else if (screen.action === "checkout") {
    await page.evaluate(() => {
      window.S.cart = { ...(window.S.cart || {}), "PACK-1": 2 };
      window.go("checkout");
    });
  } else {
    await page.evaluate((tab) => window.reset(tab), screen.tab);
  }
  await page.waitForTimeout(400);
}

for (const screen of SCREENS) {
  test(`a11y: ${screen.name} has 0 serious/critical violations`, async ({ page }) => {
    await gotoScreen(page, screen);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );

    if (blocking.length) {
      const summary = blocking.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.slice(0, 8).map((n) => ({
          target: n.target,
          html: (n.html || "").slice(0, 200),
          summary: n.failureSummary,
        })),
      }));
      console.log("\n=== VIOLATIONS ON " + screen.name + " ===");
      console.log(JSON.stringify(summary, null, 2));
    }

    expect(blocking, "axe found serious/critical violations").toEqual([]);
  });
}
