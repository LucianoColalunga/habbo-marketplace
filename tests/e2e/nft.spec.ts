import { expect, test } from "./fixtures";

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
  // El acento de la sección NFT es dorado (el Marketplace es violeta).
  const accent = await page.evaluate(() => getComputedStyle(document.querySelector(".theme-nft")!).getPropertyValue("--accent").trim());
  expect(accent).toBe("#f5b942");
  await page.getByRole("navigation", { name: "Sección del sitio" }).getByRole("link", { name: /Marketplace/ }).click();
  await expect(page).toHaveURL(/\/es$/);
});

test("inicio NFT con colecciones y rankings con datos", async ({ page }) => {
  await page.goto("/nft");
  for (const name of ["Furnis NFT", "Ropa NFT", "Mascotas NFT", "Tokens NFT", "Add-ons NFT"]) {
    await expect(page.getByRole("link", { name: new RegExp(name) }).first()).toBeVisible();
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
  // Qué pasa si compran la más barata: el próximo precio (o que no queda ninguna).
  await expect(
    page.getByText(/^(Si compran la más barata \(.+\), la próxima queda a .+ más cara\.|Hay \d+ publicadas a .+ más cara\.|Las \d+ publicaciones que muestra Immutable|Es la única publicación)/),
  ).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Total hasta acá" })).toBeVisible();
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

test("movimiento de las colecciones: vendidas, acuñadas, quemadas y cuántas existen", async ({ page }) => {
  await page.goto("/nft/coleccion/ropa");
  const flow = page.getByRole("region", { name: "Movimiento de la colección" });
  await expect(flow.getByRole("heading", { name: "Movimiento de la colección" })).toBeVisible();
  await expect(flow.getByText("Existen", { exact: true }).first()).toBeVisible();
  await expect(flow.getByText(/^Quemadas en \d+ días?$/)).toBeVisible();
  await expect(flow.getByText(/^Acuñadas en \d+ días?$/)).toBeVisible();
  await expect(flow.getByRole("img", { name: "Vendidas, quemadas y acuñadas por día" })).toBeVisible();
  // Los números también se pueden leer como tabla.
  await flow.getByText("Ver los números").click();
  await expect(flow.getByRole("columnheader", { name: "Quemadas" })).toBeVisible();

  await page.goto("/nft");
  const table = page.getByRole("region", { name: "Movimiento de las colecciones" });
  for (const name of ["Furnis NFT", "Ropa NFT", "Mascotas NFT", "Tokens NFT", "Add-ons NFT"]) {
    await expect(table.getByRole("link", { name })).toBeVisible();
  }
});

test("inspector de billeteras: qué NFT tiene y cuánto valen", async ({ page }) => {
  await page.goto("/nft/billetera");
  await page.getByLabel("Dirección de la billetera").fill("no-es-una-direccion");
  await page.getByRole("button", { name: "Inspeccionar" }).click();
  await expect(page.getByText("Esa dirección no es válida", { exact: false })).toBeVisible();
  // Una billetera pública con NFT de Habbo (de los rankings de traders).
  await page.getByLabel("Dirección de la billetera").fill("0x3bbab7ad449bdfa0abee930021c09871cf1835b8");
  await page.getByRole("button", { name: "Inspeccionar" }).click();
  await expect(page.getByText("Valor al precio piso").first()).toBeVisible({ timeout: 30_000 });
  await expect(page).toHaveURL(/\?w=0x3bbab7ad449bdfa0abee930021c09871cf1835b8$/);
  await expect(page.locator("main table tbody tr").first()).toBeVisible();
});
