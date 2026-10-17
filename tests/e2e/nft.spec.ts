import { expect, test } from "@playwright/test";

test("las dos secciones están separadas y se puede ir y volver", async ({ page }) => {
  await page.goto("/es");
  const sections = page.getByRole("navigation", { name: "Sección del sitio" });
  await expect(sections.getByRole("link", { name: /Marketplace/ })).toHaveAttribute("aria-current", "page");
  await sections.getByRole("link", { name: /NFT/ }).click();
  await expect(page).toHaveURL(/\/nft$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("NFT oficiales de Habbo");
  // Aviso fijo que explica que no es el Marketplace del juego.
  await expect(page.getByText("No son los furnis del Marketplace del juego")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Sección del sitio" }).getByRole("link", { name: /NFT/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  // El acento de la sección NFT es violeta.
  const accent = await page.evaluate(() => getComputedStyle(document.querySelector(".theme-nft")!).getPropertyValue("--accent").trim());
  expect(accent).toBe("#a78bfa");
  await page.getByRole("navigation", { name: "Sección del sitio" }).getByRole("link", { name: /Marketplace/ }).click();
  await expect(page).toHaveURL(/\/es$/);
});

test("inicio NFT con colecciones y rankings con datos", async ({ page }) => {
  await page.goto("/nft");
  for (const name of ["Furnis NFT", "Ropa NFT", "Mascotas NFT", "Tokens NFT", "Add-ons NFT"]) {
    await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
  }
  await expect(page.locator('a[href^="/nft/item/"]').first()).toBeVisible();
  await expect(page.getByText("no es asesoramiento financiero", { exact: false })).toBeVisible();
});

test("la ficha de un NFT consulta Immutable en vivo", async ({ page }) => {
  await page.goto("/nft/item/019c05de-fd53-99ad-99be-cb21be61ab86");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Silver 4th Anniversary Plaque");
  await expect(page.locator('[aria-live="polite"]').first()).toContainText("En vivo · consultado", { timeout: 20_000 });
  await expect(page.getByRole("img", { name: /Precio promedio de venta por día y precio piso/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Publicaciones más baratas" })).toBeVisible();
});

test("colección: cambiar de ranking", async ({ page }) => {
  await page.goto("/nft/coleccion/ropa");
  await expect(page.getByRole("heading", { name: /Ropa NFT/, level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "Más caros" }).click();
  await expect(page).toHaveURL(/\/nft\/coleccion\/ropa\/caros$/);
  await expect(page.getByRole("heading", { name: "Más caros", level: 2 })).toBeVisible();
});

test("buscador NFT", async ({ page }) => {
  await page.goto("/nft");
  const box = page.getByRole("combobox").first();
  await box.fill("plaque");
  await expect(page.getByRole("option").first()).toBeVisible();
  await box.press("Enter");
  await expect(page).toHaveURL(/\/nft\/buscar\?q=plaque/);
  await expect(page.getByText(/resultados para/)).toBeVisible();
});

test("la sección NFT no tiene violaciones de la política de contenido", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (msg) => {
    if (/Content Security Policy|Refused to (load|connect)/i.test(msg.text())) violations.push(msg.text());
  });
  await page.goto("/nft");
  await expect(page.locator('img[src^="https://nft-tokens.habbo.com/"]').first()).toBeVisible();
  await page.goto("/nft/item/019c05de-fd53-99ad-99be-cb21be61ab86");
  await expect(page.locator('[aria-live="polite"]').first()).toContainText("En vivo", { timeout: 20_000 });
  expect(violations).toEqual([]);
});

test("un NFT inexistente muestra no encontrado y el cron pide secreto", async ({ page, request }) => {
  await page.goto("/nft/item/00000000-0000-0000-0000-000000000000");
  await expect(page.getByText("No encontramos esa página")).toBeVisible();
  expect((await request.get("/api/cron/nft")).status()).toBe(401);
});
