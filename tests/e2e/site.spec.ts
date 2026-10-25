import { expect, test } from "./fixtures";

test("la raíz lleva al hotel por defecto y muestra rankings con datos", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/es$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Precios de furnis");
  await expect(page.getByRole("heading", { name: "Más vendidos" })).toBeVisible();
  // Con datos del recolector, la lista de más vendidos tiene filas con enlace a la ficha.
  const firstRow = page.locator('a[href^="/es/furni/"]').first();
  await expect(firstRow).toBeVisible();
  await expect(page.getByText("no es oficial", { exact: false })).toBeVisible();
});

test("el buscador encuentra furnis sin importar los acentos", async ({ page }) => {
  await page.goto("/es");
  const box = page.getByRole("combobox").first();
  await box.fill("dragon de fuego");
  const option = page.getByRole("option").first();
  await expect(option).toBeVisible();
  await expect(option).toContainText(/drag[oó]n/i);
  await box.press("Enter");
  await expect(page).toHaveURL(/\/es\/buscar\?q=/);
  await expect(page.getByText(/resultados para/)).toBeVisible();
});

test("la ficha de un furni consulta la API en vivo y dibuja el historial", async ({ page }) => {
  await page.goto("/es/furni/throne");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Trono");
  await expect(page.getByText("Precio mínimo publicado").first()).toBeVisible();
  // La consulta en vivo va del navegador directo a la API pública de Habbo.
  await expect(page.locator('[aria-live="polite"]').first()).toContainText("En vivo · consultado", { timeout: 20_000 });
  await expect(page.getByRole("img", { name: /Precio promedio de venta por día/ })).toBeVisible();
  await page.getByRole("button", { name: "Ver los datos en una tabla" }).click();
  await expect(page.getByRole("table")).toBeVisible();
});

test("rankings: cambiar de lista", async ({ page }) => {
  await page.goto("/es/rankings");
  await expect(page.getByRole("heading", { name: "Más vendidos", level: 2 })).toBeVisible();
  await page.getByRole("link", { name: "Más publicados" }).click();
  await expect(page).toHaveURL(/\/es\/rankings\/ofertados$/);
  await expect(page.getByRole("heading", { name: "Más publicados", level: 2 })).toBeVisible();
});

test("alertas: agregar un furni a la lista y quitarlo", async ({ page }) => {
  await page.goto("/es/furni/throne");
  await page.getByRole("button", { name: "Vigilar precio" }).click();
  await page.getByLabel("Porcentaje por debajo del promedio").fill("15");
  await page.getByRole("button", { name: "Guardar alerta" }).click();
  await expect(page.getByRole("button", { name: "Vigilando (1)" })).toBeVisible();
  await page.goto("/es/alertas");
  await expect(page.getByRole("row", { name: /Trono/ })).toBeVisible();
  await expect(page.getByText("15 % o más por debajo del promedio")).toBeVisible();
  await page.getByRole("button", { name: "Quitar alerta de Trono" }).click();
  await expect(page.getByText("Todavía no vigilás ningún furni")).toBeVisible();
});

test("alertas: detecta en vivo cuando el precio cumple la condición", async ({ page }) => {
  await page.goto("/es/furni/throne");
  await page.getByRole("button", { name: "Vigilar precio" }).click();
  await page.getByLabel("A un precio que elijo o menos").check();
  await page.getByLabel("Precio máximo en créditos").fill("999999");
  await page.getByRole("button", { name: "Guardar alerta" }).click();
  // El vigilante consulta la API real y avisa dentro de la página.
  await expect(page.getByRole("alert").filter({ hasText: "Oferta detectada" })).toBeVisible({ timeout: 20_000 });
  await page.goto("/es/alertas");
  await expect(page.getByText("✓ cumple")).toBeVisible();
  await expect(page.getByText(/créditos en \.es/).first()).toBeVisible();
});

test("alertas: la página pública no muestra la configuración del servidor", async ({ page }) => {
  await page.goto("/es/alertas");
  await expect(page.getByRole("heading", { name: "Para que te lleguen los avisos" })).toBeVisible();
  await expect(page.getByText("ALERTS_RULES")).toHaveCount(0);
  await page.goto("/es/alertas/servidor");
  await expect(page.getByRole("heading", { name: "Avisos por Discord o Telegram" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copiar mi lista" })).toBeDisabled();
  expect(await page.locator('meta[name="robots"][content*="noindex"]').count()).toBeGreaterThan(0);
});

test("cambiar de hotel mantiene la sección", async ({ page }) => {
  await page.goto("/es/ofertas");
  await page.getByLabel("Elegir hotel").selectOption("com");
  await expect(page).toHaveURL(/\/com\/ofertas$/);
});

test("un furni que no existe muestra la página de no encontrado (sin indexar)", async ({ page }) => {
  // La ficha se transmite por partes: el "no encontrado" llega después del primer envío,
  // así que Next.js responde 200 y agrega noindex (comportamiento documentado de Next 16).
  await page.goto("/es/furni/no_existe_zzz");
  await expect(page.getByText("No encontramos esa página")).toBeVisible();
  expect(await page.locator('meta[name="robots"][content*="noindex"]').count()).toBeGreaterThan(0);
});

test("un hotel inexistente también muestra no encontrado", async ({ page }) => {
  await page.goto("/xx");
  await expect(page.getByText("No encontramos esa página")).toBeVisible();
});

test("las rutas del recolector piden el secreto en producción", async ({ request }) => {
  const res = await request.get("/api/cron/scan?hotel=es");
  expect(res.status()).toBe(401);
});

test("movimiento del mercado en el inicio del hotel y en cada categoría", async ({ page }) => {
  await page.goto("/es");
  const home = page.getByRole("region", { name: "Movimiento del mercado" });
  await expect(home.getByRole("heading", { name: "Movimiento del mercado" })).toBeVisible();
  await page.goto("/es/categorias/asientos");
  const cat = page.getByRole("region", { name: "Movimiento de la categoría" });
  await expect(cat.getByRole("heading", { name: "Movimiento de la categoría" })).toBeVisible();
  await expect(cat.getByText("Publicadas ahora")).toBeVisible();
  // Con días listos se ve el gráfico y se puede cambiar de medida; si no, el aviso de que se está juntando.
  const tabs = cat.getByRole("group", { name: "Qué mostrar en el gráfico" });
  if (await tabs.isVisible()) {
    await expect(cat.getByRole("img", { name: "Unidades vendidas por día" })).toBeVisible();
    await tabs.getByRole("button", { name: "Créditos" }).click();
    await expect(cat.getByRole("img", { name: "Créditos movidos por día" })).toBeVisible();
  } else {
    await expect(cat.getByText("Se está juntando", { exact: false })).toBeVisible();
  }
});

test("planes Standard y VIP, y la comparación con SecureHabbo", async ({ page }) => {
  await page.goto("/es/planes");
  await expect(page.getByRole("heading", { level: 1, name: "Planes" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Standard" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "VIP" })).toBeVisible();
  const compare = page.getByRole("region", { name: "Stats frente a SecureHabbo" });
  await expect(compare.getByRole("cell", { name: "Inspector de billeteras" })).toBeVisible();
  await expect(compare.getByRole("cell", { name: "Comprar y vender con billetera" })).toBeVisible();
  await expect(compare.getByText("No, a propósito").first()).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Secciones" }).getByRole("link", { name: "Planes" })).toBeVisible();
});

test("usuarios conectados en Habbo Origins, en vivo", async ({ page }) => {
  const origins = page.waitForResponse((r) => r.url().includes("/api/public/origins/users"));
  await page.goto("/es/conectados");
  expect((await origins).ok()).toBe(true);
  await expect(page.getByText("Total en Origins")).toBeVisible();
  await expect(page.getByText(/^Actualizado /)).toBeVisible({ timeout: 15_000 });
});
