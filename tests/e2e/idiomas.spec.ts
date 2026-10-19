import { expect, test, type Page } from "./fixtures";

/** Junta errores de la consola (hidratación, política de contenido) mientras dura la prueba. */
function watchConsole(page: Page) {
  const problems: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error" && /hydrat|did not match|Content Security Policy|Refused to/i.test(text)) problems.push(text);
  });
  page.on("pageerror", (err) => problems.push(err.message));
  return problems;
}

test("se puede cambiar de idioma y la página se traduce", async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto("/es/rankings");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  const switcher = page.getByRole("navigation", { name: "Elegir idioma" });
  await switcher.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en\/es\/rankings$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(".es rankings");
  await expect(page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Deals" })).toBeVisible();

  await page.getByRole("navigation", { name: "Choose language" }).getByRole("link", { name: "Português" }).click();
  await expect(page).toHaveURL(/\/pt\/es\/rankings$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page.getByRole("heading", { name: "Mais vendidos", level: 2 })).toBeVisible();

  await page.getByRole("navigation", { name: "Escolher idioma" }).getByRole("link", { name: "Español" }).click();
  await expect(page).toHaveURL(/\/es\/rankings$/);
  await expect(page.getByRole("heading", { name: "Más vendidos", level: 2 })).toBeVisible();
  expect(problems).toEqual([]);
});

test("el idioma elegido se recuerda al volver a entrar por la portada", async ({ page }) => {
  await page.goto("/es");
  await page.getByRole("navigation", { name: "Elegir idioma" }).getByRole("link", { name: "Português" }).click();
  await expect(page).toHaveURL(/\/pt\/es$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/pt\/br$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Preços de mobis");
});

test("inglés: ficha de un furni en vivo, con enlaces que siguen en inglés", async ({ page }) => {
  const problems = watchConsole(page);
  // Hotel .es con la interfaz en inglés (los nombres de furnis son los del hotel).
  await page.goto("/en/es/furni/throne");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Trono");
  await expect(page.getByText("Lowest listed price").first()).toBeVisible();
  await expect(page.locator('[aria-live="polite"]').first()).toContainText("Live · checked", { timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Watch price" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Home" })).toHaveAttribute("href", "/en/es");
  expect(problems).toEqual([]);
});

test("portugués: sección NFT separada y traducida", async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto("/pt/nft");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Preços e vendas dos NFT oficiais do Habbo");
  await expect(page.getByText("Não são os mobis do Marketplace do jogo")).toBeVisible();
  await expect(page.getByRole("link", { name: /Roupas NFT/ })).toBeVisible();
  const sections = page.getByRole("navigation", { name: "Seção do site" });
  await expect(sections.getByRole("link", { name: /Marketplace/ })).toHaveAttribute("href", "/pt/br");
  expect(problems).toEqual([]);
});

test("las direcciones en español no cambian y la interna redirige a la visible", async ({ page }) => {
  const problems = watchConsole(page);
  await page.goto("/es/com");
  await expect(page).toHaveURL(/\/com$/);
  await page.goto("/es/nft/acerca");
  await expect(page).toHaveURL(/\/nft\/acerca$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Sección NFT");
  expect(problems).toEqual([]);
});

test("una dirección inexistente muestra la página de error en los tres idiomas", async ({ page }) => {
  const res = await page.goto("/xx/yy/zz");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("No encontramos esa página")).toBeVisible();
  await expect(page.getByText("We couldn't find that page")).toBeVisible();
});
