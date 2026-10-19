import { expect, test } from "./fixtures";

// El Chromium headless "liviano" siempre informa las notificaciones como bloqueadas;
// el Chromium completo en modo headless sí las permite.
test.use({ channel: "chromium" });

test("notificaciones: con permiso, el aviso de prueba se muestra", async ({ page, context }) => {
  await context.grantPermissions(["notifications"]);
  await page.goto("/es/alertas");
  await page.getByLabel("Mostrar notificaciones del navegador").check();
  await page.getByRole("button", { name: "Probar aviso" }).click();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        return reg ? (await reg.getNotifications()).map((n) => n.title) : [];
      }),
    )
    .toContain("Bomhams Market");
});
