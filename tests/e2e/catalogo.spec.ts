import { expect, test } from "./fixtures";

test("catálogo: menú de categorías al costado y filtros seleccionados", async ({ page, isMobile }) => {
  await page.goto("/es/categorias/asientos");
  if (isMobile) await page.getByRole("button", { name: "Filtrar y categorías" }).click();
  const menu = page.locator("#catalog-filters");
  await expect(menu.getByRole("heading", { name: "Categorías" })).toBeVisible();
  await expect(menu.getByRole("link", { name: /^Asientos/ })).toHaveAttribute("aria-current", "page");
  await expect(menu.getByRole("link", { name: "Quitar el filtro Asientos" })).toBeVisible();

  // Las subcategorías de la categoría actual están abiertas; se pueden cerrar y abrir.
  await menu.getByRole("button", { name: "Ocultar subcategorías de Asientos" }).click();
  await expect(menu.getByRole("link", { name: /^Sofás/ })).toHaveCount(0);
  await menu.getByRole("button", { name: "Ver subcategorías de Asientos" }).click();
  await menu.getByRole("link", { name: /^Sofás/ }).click();
  await expect(page).toHaveURL(/\/es\/categorias\/asientos\/sofas$/);
  await expect(page.getByRole("heading", { level: 1, name: "Sofás" })).toBeVisible();

  if (isMobile) await page.getByRole("button", { name: "Filtrar y categorías" }).click();
  await expect(menu.getByRole("link", { name: "Quitar el filtro Sofás" })).toBeVisible();
  await menu.getByRole("link", { name: "Limpiar filtro" }).click();
  await expect(page).toHaveURL(/\/es\/categorias$/);
  await expect(page.getByRole("heading", { level: 1, name: "Categorías de .es" })).toBeVisible();
});

test("catálogo: elegir el tamaño de las imágenes, lista y páginas", async ({ page }) => {
  await page.goto("/es/categorias/asientos");
  const results = page.locator("p[aria-live=polite]");
  const views = page.getByRole("group", { name: "Tamaño de las imágenes" });
  await expect(results).toHaveText(/^1–32 de \d/);
  await expect(views.getByRole("button", { name: "Imágenes medianas" })).toHaveAttribute("aria-pressed", "true");

  await views.getByRole("button", { name: "Imágenes grandes" }).click();
  await expect(results).toHaveText(/^1–24 de \d/);
  // El pixel art se agranda por un número entero, para que quede nítido.
  const img = page.locator("main ul img").first();
  await expect(img).toHaveClass(/opacity-100/);
  const { natural, shown } = await img.evaluate((i: HTMLImageElement) => ({ natural: i.naturalWidth, shown: i.getBoundingClientRect().width }));
  expect(shown).toBeGreaterThan(natural);
  expect(Math.round(shown) % natural).toBe(0);

  await views.getByRole("button", { name: "Lista" }).click();
  await expect(results).toHaveText(/^1–40 de \d/);
  await page.getByRole("navigation", { name: "Páginas" }).getByRole("button", { name: "Siguiente" }).click();
  await expect(results).toHaveText(/^41–80 de \d/);

  // Con las preferencias aceptadas, la vista elegida se recuerda.
  await page.reload();
  await expect(views.getByRole("button", { name: "Lista" })).toHaveAttribute("aria-pressed", "true");
  await views.getByRole("button", { name: "Imágenes medianas" }).click();
});

test("catálogo: buscar dentro de la lista y ordenar", async ({ page, isMobile }) => {
  await page.goto("/es/categorias/asientos");
  if (isMobile) await page.getByRole("button", { name: "Filtrar y categorías" }).click();
  await page.getByRole("searchbox", { name: "Filtrar esta lista por nombre" }).fill("trono");
  const names = page.locator("main ul li a .line-clamp-2");
  await expect(names.first()).toContainText(/trono/i);
  const all = await names.allTextContents();
  expect(all.length).toBeGreaterThan(0);
  expect(all.every((n) => /trono/i.test(n))).toBe(true);
  await page.getByRole("combobox", { name: /Ordenar por/ }).selectOption("name");
  const sorted = await names.allTextContents();
  expect(sorted).toEqual([...sorted].sort((a, b) => a.localeCompare(b)));
});

test("catálogo y rankings: los precios en pantalla se consultan en vivo a Habbo", async ({ page }) => {
  for (const path of ["/es/categorias/asientos", "/es/rankings"]) {
    const habbo = page.waitForResponse((r) => r.url().includes("/api/public/marketplace/stats/batch"));
    await page.goto(path);
    expect((await habbo).ok(), path).toBe(true);
    await expect(page.getByText("Precios en vivo de Habbo", { exact: false }).first(), path).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("main [title='precio en vivo']").nth(1), path).toBeVisible();
  }
});
