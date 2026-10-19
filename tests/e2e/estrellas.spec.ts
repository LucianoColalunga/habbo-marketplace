import { expect, test, type Page } from "./fixtures";

/** Píxeles encendidos del cielo de estrellas en un círculo alrededor de (x, y); sin radio, toda la pantalla. */
async function litPixels(page: Page, x = 0, y = 0, radius = 0): Promise<number> {
  return page.evaluate(
    ({ x, y, radius }) => {
      const canvas = document.querySelector<HTMLCanvasElement>("canvas[data-starfield]");
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx || canvas.width === 0) return -1;
      const scale = canvas.width / window.innerWidth;
      const r = Math.round(radius * scale);
      const data = radius
        ? ctx.getImageData(Math.round(x * scale) - r, Math.round(y * scale) - r, r * 2, r * 2).data
        : ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let lit = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] > 40) lit++;
      return lit;
    },
    { x, y, radius },
  );
}

/** Espera a que el cielo esté dibujado (la página ya cargó su código). */
async function starsReady(page: Page) {
  await expect.poll(() => litPixels(page), { timeout: 10_000 }).toBeGreaterThan(0);
}

/** Puntos vacíos del recuadro de bienvenida (fondo transparente, sin botones). */
async function emptyHeroPoints(page: Page) {
  // El recuadro llega con los datos, un instante después que el resto de la página.
  const hero = page.locator("section.iso-floor");
  await expect(hero).toBeVisible();
  const box = (await hero.boundingBox())!;
  return [0.95, 0.75, 0.55].map((f) => ({ x: box.x + box.width * f, y: box.y + 20 }));
}

test("el fondo de estrellas no tapa nada y una estrella explota al tocarla", async ({ page }) => {
  await page.goto("/es");
  const canvas = page.locator("canvas[data-starfield]");
  await expect(canvas).toBeAttached();
  expect(await canvas.evaluate((c) => getComputedStyle(c).pointerEvents)).toBe("none");
  await starsReady(page);

  // Cada toque hace explotar la estrella más cercana: la onda y las chispas
  // encienden muchos más píxeles que una estrella sola.
  let exploded = false;
  for (const { x, y } of await emptyHeroPoints(page)) {
    const before = await litPixels(page, x, y, 45);
    await page.mouse.click(x, y);
    await page.waitForTimeout(120);
    if ((await litPixels(page, x, y, 60)) > before + 30) {
      exploded = true;
      break;
    }
  }
  expect(exploded).toBe(true);

  // Los botones y enlaces siguen funcionando con el cielo detrás.
  await page.getByRole("navigation", { name: "Secciones" }).getByRole("link", { name: "Ofertas" }).click();
  await expect(page).toHaveURL(/\/es\/ofertas$/);
});

test("se pueden apagar las estrellas y queda recordado", async ({ page }) => {
  await page.goto("/es/acerca");
  await expect(page.locator("canvas[data-starfield]")).toBeAttached();
  await page.getByRole("button", { name: /Apagar estrellas/ }).click();
  await expect(page.locator("canvas[data-starfield]")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: /Encender estrellas/ })).toBeVisible();
  await expect(page.locator("canvas[data-starfield]")).toHaveCount(0);
  await page.getByRole("button", { name: /Encender estrellas/ }).click();
  await expect(page.locator("canvas[data-starfield]")).toBeAttached();
});

test("con 'reducir movimiento' las estrellas quedan quietas y no explotan", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/es");
  await starsReady(page);
  const [{ x, y }] = await emptyHeroPoints(page);
  const before = await litPixels(page);
  await page.mouse.click(x, y);
  await page.waitForTimeout(150);
  expect(await litPixels(page)).toBe(before);
});
