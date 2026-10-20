import { randomBytes } from "node:crypto";
import { readFileSync, rmSync } from "node:fs";
import { expect, test } from "./fixtures";

// Las cuentas solo existen donde hay base de datos: en local, el servidor de
// pruebas usa un archivo (ACCOUNTS_DEV_STORE=1). Contra producción se saltean
// salvo que se pida con E2E_CUENTAS=1 (crearía una cuenta real).
test.skip(!!process.env.PLAYWRIGHT_BASE_URL && process.env.E2E_CUENTAS !== "1", "en producción no se crean cuentas de prueba");

// Credenciales generadas para esta prueba (no son de nadie y no se repiten).
const user = `prueba_${randomBytes(4).toString("hex")}`;
const pass = `clave-${randomBytes(9).toString("base64url")}`;
const mail = `${user}@example.com`;
// La cuenta de administración que el servidor de prueba tiene en ADMIN_USERS.
const ADMIN = "jefe_e2e";

/** Busca en los correos de prueba (.data/mail-outbox.json) el enlace que le llegó a `to`. */
async function mailLink(to: string, page: "verificar" | "restablecer"): Promise<string> {
  for (let i = 0; i < 40; i++) {
    try {
      const list = JSON.parse(readFileSync(".data/mail-outbox.json", "utf8")) as { to: string; text: string }[];
      const found = [...list].reverse().find((m) => m.to === to && m.text.includes(`/cuenta/${page}?token=`));
      const link = found?.text.match(/https?:\/\/\S+/g)?.find((l) => l.includes(`/cuenta/${page}?token=`));
      if (link) {
        const url = new URL(link);
        return url.pathname + url.search;
      }
    } catch {
      // todavía no hay correos
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No llegó el correo para ${to}`);
}

test.describe.configure({ mode: "serial" });

// En local, cada corrida empieza con la base de prueba vacía (también los límites por conexión).
test.beforeAll(() => {
  if (!process.env.PLAYWRIGHT_BASE_URL) {
    rmSync(".data/accounts-dev.json", { force: true });
    rmSync(".data/mail-outbox.json", { force: true });
  }
});

test("crear cuenta, guardar una alerta y verla desde otro dispositivo", async ({ page, browser, context, baseURL }) => {
  await page.goto("/es/cuenta");
  await page.getByRole("tab", { name: "Crear cuenta" }).click();
  await page.getByLabel("Usuario").fill(user);
  await page.getByLabel("Email").fill(mail);
  await page.getByLabel("Contraseña", { exact: true }).fill(pass);
  await page.getByLabel("Repetir contraseña").fill(pass);
  await expect(page.getByText("No uses la misma contraseña que en Habbo", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Crear cuenta" }).last().click();
  await expect(page.getByRole("heading", { name: `Conectado como ${user}` })).toBeVisible();
  await expect(page.getByText(`Te mandamos un correo a ${mail} para confirmarlo.`)).toBeVisible();
  await expect(page.getByText("Confirmá tu email: te mandamos un enlace.", { exact: false })).toBeVisible();

  // El enlace del correo confirma el email y se borra de la dirección.
  await page.goto(await mailLink(mail, "verificar"));
  await expect(page.getByText("¡Listo! Tu email quedó confirmado.")).toBeVisible();
  await expect(page).not.toHaveURL(/token=/);
  await page.goto("/es/cuenta");
  await expect(page.getByText("Confirmado", { exact: true })).toBeVisible();
  await expect(page.getByText("Confirmá tu email: te mandamos un enlace.", { exact: false })).toHaveCount(0);

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

test("recuperar usuario y contraseña por email", async ({ page, browser, baseURL }) => {
  const name = `rec_${randomBytes(4).toString("hex")}`;
  const to = `${name}@example.com`;
  const reg = await page.request.post("/api/account/register", {
    headers: { Origin: baseURL! },
    data: { username: name, email: to, password: pass, lang: "es" },
  });
  expect(reg.status()).toBe(200);
  await page.goto(await mailLink(to, "verificar"));
  await expect(page.getByText("¡Listo! Tu email quedó confirmado.")).toBeVisible();

  // Desde otro navegador, sin saber el usuario ni la contraseña.
  const other = await browser.newContext({ baseURL, locale: "es-AR" });
  const page2 = await other.newPage();
  await page2.addInitScript(() => localStorage.setItem("bm:consent", JSON.stringify({ v: 1, prefs: true, at: Date.now() })));
  await page2.goto("/es/cuenta");
  await page2.getByRole("button", { name: "¿Te olvidaste el usuario o la contraseña?" }).click();
  await page2.getByLabel("Email").fill(to.toUpperCase());
  await page2.getByRole("button", { name: "Mandarme el correo" }).click();
  await expect(page2.getByText("Listo. Si ese email tiene una cuenta confirmada", { exact: false })).toBeVisible();

  const link = await mailLink(to, "restablecer");
  const outbox = JSON.parse(readFileSync(".data/mail-outbox.json", "utf8")) as { to: string; text: string }[];
  expect(outbox.some((m) => m.to === to && m.text.includes(`Usuario: ${name}`))).toBe(true);
  await page2.goto(link);
  await expect(page2).not.toHaveURL(/token=/);
  const fresh = `nueva-${randomBytes(9).toString("base64url")}`;
  await page2.getByLabel("Contraseña nueva").fill(fresh);
  await page2.getByLabel("Repetir contraseña").fill(fresh);
  await page2.getByRole("button", { name: "Guardar contraseña nueva" }).click();
  await expect(page2.getByText(`Listo, ${name}: tu contraseña cambió y ya entraste.`)).toBeVisible();

  // El enlace sirve una sola vez y la sesión vieja se cerró.
  await page2.goto(link);
  await page2.getByLabel("Contraseña nueva").fill(fresh);
  await page2.getByLabel("Repetir contraseña").fill(fresh);
  await page2.getByRole("button", { name: "Guardar contraseña nueva" }).click();
  await expect(page2.getByText("El enlace no sirve: ya se usó o venció", { exact: false })).toBeVisible();
  expect(await (await page.request.get("/api/account/me")).json()).toMatchObject({ user: null });
  await other.close();

  // Un email sin cuenta recibe la misma respuesta (no se puede averiguar quién tiene cuenta).
  const unknown = await page.request.post("/api/account/forgot", { headers: { Origin: baseURL! }, data: { email: "nadie@example.com", lang: "es" } });
  expect(await unknown.json()).toEqual({ ok: true });
});

test("panel de administración", async ({ page, browser, baseURL }) => {
  // Sin sesión de administración, el panel "no existe".
  expect((await page.request.get("/api/admin/status")).status()).toBe(404);

  const victim = `vic_${randomBytes(4).toString("hex")}`;
  const other = await browser.newContext({ baseURL });
  const vic = await other.request.post("/api/account/register", {
    headers: { Origin: baseURL! },
    data: { username: victim, email: `${victim}@example.com`, password: pass, lang: "es" },
  });
  expect(vic.status()).toBe(200);
  // Una cuenta común tampoco lo ve.
  expect((await other.request.get("/api/admin/status")).status()).toBe(404);

  const reg = await page.request.post("/api/account/register", {
    headers: { Origin: baseURL! },
    data: { username: ADMIN, email: "jefe@example.com", password: pass, lang: "es" },
  });
  expect(reg.status()).toBe(200);
  // Pedidos de otros sitios: rechazados aunque haya sesión.
  const evil = await page.request.post("/api/admin/ban", { headers: { Origin: "https://otro-sitio.example" }, data: { u: victim, banned: true } });
  expect(evil.status()).toBe(403);

  // Entra con el formulario, como una persona (la cuenta se creó directo con la API).
  await page.goto("/es/cuenta");
  await page.getByLabel("Usuario").fill(ADMIN);
  await page.getByLabel("Contraseña", { exact: true }).fill(pass);
  await page.getByRole("button", { name: "Entrar" }).last().click();
  await page.getByRole("link", { name: "Panel de administración" }).click();
  await expect(page.getByRole("heading", { name: "Estado del sitio" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Configuración" })).toBeVisible();
  await expect(page.getByText("archivo de prueba (no se envían)")).toBeVisible();
  const row = page.getByRole("row", { name: new RegExp(victim) });
  await expect(row).toContainText("vi***@example.com");
  await expect(page.getByRole("row", { name: new RegExp(ADMIN) })).toContainText("(vos)");
  // Las tablas se desplazan dentro de su cuadro: la página no se corre hacia los costados en el celular.
  const width = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(width).toBeLessThanOrEqual(0);

  // Bloquear cierra la sesión de esa cuenta.
  await row.getByRole("button", { name: "Bloquear" }).click();
  await expect(row).toContainText("bloqueada");
  expect(await (await other.request.get("/api/account/me")).json()).toMatchObject({ user: null });

  // Borrar pide escribir el nombre.
  await row.getByRole("button", { name: "Borrar" }).click();
  await row.getByRole("textbox").fill("otro-nombre");
  await row.getByRole("button", { name: "Borrar para siempre" }).click();
  await expect(page.getByText("El nombre no coincide.")).toBeVisible();
  await row.getByRole("textbox").fill(victim);
  await row.getByRole("button", { name: "Borrar para siempre" }).click();
  await expect(page.getByRole("row", { name: new RegExp(victim) })).toHaveCount(0);
  await expect(page.getByText(`${ADMIN} borró a ${victim}`)).toBeVisible();
  await expect(page.getByText(`${ADMIN} bloqueó a ${victim}`)).toBeVisible();
  await other.close();
});

test("la configuración de cuentas es igual para todos y la guarda el CDN", async ({ request }) => {
  const res = await request.get("/api/account/config");
  expect(res.headers()["cache-control"]).toContain("s-maxage");
  expect(await res.json()).toEqual({ enabled: true, mail: true });
});
