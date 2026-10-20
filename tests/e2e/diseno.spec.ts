import { expect, test } from "./fixtures";

test("ninguna página se corre hacia los costados (sobre todo en el celular)", async ({ page }) => {
  for (const path of ["/es", "/es/categorias", "/es/categorias/asientos", "/es/furni/throne", "/es/ofertas", "/es/rankings", "/es/rankings/caros", "/es/cuenta", "/es/cuenta/restablecer", "/es/admin", "/nft", "/nft/rankings", "/pt/es", "/en/es/alertas"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(scroll, `ancho de ${path}`).toBeLessThanOrEqual(client);
  }
});

test("el pie de página: en construcción, sin la comunidad ni X, y el crédito de Luciano Dev", async ({ page }) => {
  await page.goto("/es");
  const footer = page.locator("footer");
  await expect(footer.locator('a[href*="x.com"]')).toHaveCount(0);
  await expect(footer).not.toContainText("Bomhams");
  await expect(footer.getByText("En construcción", { exact: true })).toBeVisible();
  await expect(footer).not.toContainText("comunidad BOMHAMS");
  await expect(footer).not.toContainText("de fans");
  await expect(page.getByRole("banner")).toContainText("Stats");
  await expect(footer).toContainText(/Desarrollado por\s+Luciano Dev/i);
  await expect(footer.getByRole("link", { name: "Luciano Dev" })).toHaveAttribute("href", "https://lucianocolalungadev.com.ar/");
  await page.goto("/en/nft");
  await expect(page.locator("footer a[href*='x.com']")).toHaveCount(0);
  await expect(page.locator("footer").getByText("Under construction", { exact: true })).toBeVisible();
  await expect(page.locator("footer")).toContainText(/Built by\s+Luciano Dev/i);
});
