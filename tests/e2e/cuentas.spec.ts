import { randomBytes } from "node:crypto";
import { rmSync } from "node:fs";
import { expect, test } from "./fixtures";

// Las cuentas solo existen donde hay base de datos: en local, el servidor de
// pruebas usa un archivo (ACCOUNTS_DEV_STORE=1). Contra producción se saltean
// salvo que se pida con E2E_CUENTAS=1 (crearía una cuenta real).
test.skip(!!process.env.PLAYWRIGHT_BASE_URL && process.env.E2E_CUENTAS !== "1", "en producción no se crean cuentas de prueba");

// Credenciales generadas para esta prueba (no son de nadie y no se repiten).
const user = `prueba_${randomBytes(4).toString("hex")}`;
const pass = `clave-${randomBytes(9).toString("base64url")}`;

test.describe.configure({ mode: "serial" });

// En local, cada corrida empieza con la base de prueba vacía (también los límites por conexión).
test.beforeAll(() => {
  if (!process.env.PLAYWRIGHT_BASE_URL) rmSync(".data/accounts-dev.json", { force: true });
});

test("crear cuenta, guardar una alerta y verla desde otro dispositivo", async ({ page, browser, context, baseURL }) => {
  await page.goto("/es/cuenta");
  await page.getByRole("tab", { name: "Crear cuenta" }).click();
  await page.getByLabel("Usuario").fill(user);
  await page.getByLabel("Contraseña", { exact: true }).fill(pass);
  await page.getByLabel("Repetir contraseña").fill(pass);
  await expect(page.getByText("No uses la misma contraseña que en Habbo", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Crear cuenta" }).last().click();
  await expect(page.getByRole("heading", { name: `Conectado como ${user}` })).toBeVisible();

  // La cookie de sesión no se puede leer desde la página.
  const session = (await context.cookies()).find((c) => c.name === "bm_session");
  expect(session).toMatchObject({ httpOnly: true, sameSite: "Lax" });

  // Una alerta desde la ficha de un furni se guarda en la cuenta.
  await page.goto("/es/furni/throne");
  await page.getByRole("button", { name: "Vigilar precio" }).click();
  const saved = page.waitForResponse((r) => r.url().includes("/api/account/rules") && r.request().method() === "PUT");
  await page.getByRole("button", { name: "Guardar alerta" }).click();
  expect((await saved).status()).toBe(200);

  // "Otro dispositivo": un navegador nuevo, sin nada guardado.
  const other = await browser.newContext({ baseURL, locale: "es-AR" });
  const page2 = await other.newPage();
  await page2.addInitScript(() => localStorage.setItem("bm:consent", JSON.stringify({ v: 1, prefs: true, at: Date.now() })));
  await page2.goto("/es/cuenta");
  await page2.getByLabel("Usuario").fill(user);
  await page2.getByLabel("Contraseña", { exact: true }).fill("una-clave-equivocada");
  await page2.getByRole("button", { name: "Entrar" }).last().click();
  await expect(page2.getByText("Usuario o contraseña incorrectos.")).toBeVisible();
  await page2.getByLabel("Contraseña", { exact: true }).fill(pass);
  await page2.getByRole("button", { name: "Entrar" }).last().click();
  await expect(page2.getByRole("heading", { name: `Conectado como ${user}` })).toBeVisible();
  await page2.goto("/es/alertas");
  await expect(page2.getByRole("heading", { name: "Mi lista (1)" })).toBeVisible();
  await expect(page2.getByRole("link", { name: /Trono/ }).first()).toBeVisible();
  await expect(page2.getByText(`Tu lista se guarda en tu cuenta (${user}).`)).toBeVisible();
  await other.close();

  // Borrar la cuenta.
  await page.goto("/es/cuenta");
  await page.getByRole("textbox", { name: "Contraseña", exact: true }).fill(pass);
  await page.getByLabel("Sí, quiero borrar mi cuenta").check();
  await page.getByRole("button", { name: "Borrar cuenta para siempre" }).click();
  await expect(page.getByRole("tab", { name: "Crear cuenta" })).toBeVisible();
});

test("la API de cuentas rechaza pedidos de otros sitios y no se guarda en caché", async ({ request }) => {
  const evil = await request.post("/api/account/login", {
    headers: { Origin: "https://otro-sitio.example", "Content-Type": "application/json" },
    data: { username: "alguien", password: "lo-que-sea-123" },
  });
  expect(evil.status()).toBe(403);
  const me = await request.get("/api/account/me");
  expect(me.headers()["cache-control"]).toBe("no-store");
  expect(await me.json()).toMatchObject({ enabled: true, user: null });
});
