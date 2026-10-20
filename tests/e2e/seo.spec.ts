import { expect, test } from "./fixtures";

test("robots.txt y sitemap con las páginas en los tres idiomas", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  const text = await robots.text();
  expect(text).toContain("Disallow: /api/");
  expect(text).toMatch(/Sitemap: https?:\/\/[^\s]+\/sitemap\.xml/);

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml).toMatch(/<loc>https?:\/\/[^<]+\/es<\/loc>/);
  expect(xml).toMatch(/<loc>https?:\/\/[^<]+\/pt\/nft<\/loc>/);
  expect(xml).toContain('hreflang="x-default"');
  expect(xml).toMatch(/\/furni\/[^<]+<\/loc>/);
  expect(xml).not.toContain("/buscar");
});

test("cada página dice su dirección canónica, sus idiomas y su imagen para compartir", async ({ page, request }) => {
  await page.goto("/en/es/rankings/vendidos");
  const head = page.locator("head");
  await expect(head.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/en\/es\/rankings$/);
  await expect(head.locator('link[rel="alternate"][hreflang="pt-BR"]')).toHaveAttribute("href", /\/pt\/es\/rankings$/);
  await expect(head.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute("href", /\/es\/rankings$/);
  await expect(head.locator('meta[property="og:locale"]')).toHaveAttribute("content", "en_US");
  const image = await head.locator('meta[property="og:image"]').getAttribute("content");
  expect(image).toMatch(/\/og\/market-en\.png$/);
  const png = await request.get(new URL(image!).pathname);
  expect(png.status()).toBe(200);
  expect(png.headers()["content-type"]).toBe("image/png");
  expect((await png.body()).length).toBeGreaterThan(10_000);
  await expect(page).toHaveTitle("Best sellers on the Habbo .es Marketplace · Stats");
});

test("las búsquedas internas no se indexan", async ({ page }) => {
  await page.goto("/es/buscar?q=trono");
  await expect(page.locator('head meta[name="robots"]')).toHaveAttribute("content", "noindex, follow");
});
