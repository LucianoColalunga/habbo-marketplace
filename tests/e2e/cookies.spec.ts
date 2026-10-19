import { expect, test } from "@playwright/test";

// Sin el aviso respondido de antemano: estas pruebas son sobre el aviso.

test("el aviso de cookies aparece una vez y 'solo las necesarias' no guarda preferencias", async ({ page, context }) => {
  await page.goto("/es");
  const banner = page.getByRole("region", { name: "Aviso de cookies" });
  await expect(banner).toBeVisible();
  await banner.getByRole("button", { name: "Solo las necesarias" }).click();
  await expect(banner).toBeHidden();

  // Sin permiso de preferencias, elegir idioma no deja la cookie fm_lang.
  await page.getByRole("navigation", { name: "Elegir idioma" }).getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en\/es$/);
  expect((await context.cookies()).some((c) => c.name === "fm_lang")).toBe(false);

  // No vuelve a aparecer, pero se puede reabrir desde el pie de página.
  await page.reload();
  await expect(page.getByRole("region", { name: "Cookie notice" })).toBeHidden();
  await page.getByRole("button", { name: "Cookies", exact: true }).click();
  const again = page.getByRole("region", { name: "Cookie notice" });
  await expect(again).toBeVisible();
  await again.getByRole("button", { name: "Accept all" }).click();
  await page.getByRole("navigation", { name: "Choose language" }).getByRole("link", { name: "Português" }).click();
  await expect(page).toHaveURL(/\/pt\/es$/);
  await expect.poll(async () => (await context.cookies()).find((c) => c.name === "fm_lang")?.value).toBe("pt");
});

test("la página de privacidad explica qué se guarda, en los tres idiomas", async ({ page }) => {
  await page.goto("/es/privacidad");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacidad y cookies");
  await expect(page.getByText("No uses la misma contraseña que en Habbo", { exact: false })).toBeVisible();
  await page.goto("/en/com/privacidad");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy & cookies");
});
