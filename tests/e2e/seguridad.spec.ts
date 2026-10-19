import { expect, test } from "./fixtures";

test("las respuestas traen los encabezados de seguridad", async ({ request }) => {
  for (const path of ["/es", "/es/furni/throne", "/api/search?hotel=es&q=trono"]) {
    const res = await request.get(path);
    const h = res.headers();
    expect(h["content-security-policy"], path).toContain("frame-ancestors 'none'");
    expect(h["content-security-policy"], path).toContain("object-src 'none'");
    expect(h["x-frame-options"], path).toBe("DENY");
    expect(h["x-content-type-options"], path).toBe("nosniff");
    expect(h["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
    expect(h["x-powered-by"], path).toBeUndefined();
  }
});

test("la política de contenido no bloquea nada que use el sitio", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (msg) => {
    if (/Content Security Policy|Refused to (load|connect|execute|apply)/i.test(msg.text())) violations.push(msg.text());
  });
  await page.goto("/es");
  await expect(page.locator('img[src^="https://images.habbo.com/"]').first()).toBeVisible();
  await page.goto("/es/furni/throne");
  await expect(page.locator('[aria-live="polite"]').first()).toContainText("En vivo · consultado", { timeout: 20_000 });
  await page.goto("/es/alertas");
  await expect(page.getByRole("heading", { name: "Alertas de precio" })).toBeVisible();
  expect(violations).toEqual([]);
});

test("la búsqueda no refleja HTML", async ({ request, page }) => {
  const payload = '<img src=x onerror="window.__xss=1">';
  const res = await request.get(`/api/search?hotel=es&q=${encodeURIComponent(payload)}`);
  expect(res.ok()).toBe(true);
  expect(await res.json()).toEqual({ results: [] });
  await page.goto(`/es/buscar?q=${encodeURIComponent(payload)}`);
  await expect(page.getByText(/No encontramos furnis/)).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
});
