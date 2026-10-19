import { expect, test } from "./fixtures";

test("ninguna página se corre hacia los costados (sobre todo en el celular)", async ({ page }) => {
  for (const path of ["/es", "/es/categorias", "/es/categorias/asientos", "/es/furni/throne", "/es/ofertas", "/es/rankings", "/es/rankings/caros", "/es/cuenta", "/nft", "/nft/rankings", "/pt/es", "/en/es/alertas"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(scroll, `ancho de ${path}`).toBeLessThanOrEqual(client);
  }
});

test("el pie de página enlaza a la comunidad en X", async ({ page }) => {
  await page.goto("/es");
  await expect(page.getByRole("link", { name: "Bomhams en X" })).toHaveAttribute("href", "https://x.com/bomhams");
  await page.goto("/en/nft");
  await expect(page.getByRole("link", { name: "Bomhams on X" })).toHaveAttribute("href", "https://x.com/bomhams");
});
