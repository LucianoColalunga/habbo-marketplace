import { describe, expect, it, vi } from "vitest";
import { resetEmail, verifyEmail } from "@/lib/accounts/emails";
import { canAdmin } from "@/lib/accounts/http";
import { accountsEnabled, sessionKeyMaterial, UpstashKV, type KV } from "@/lib/accounts/kv";
import { mailEnabled } from "@/lib/accounts/mailer";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/accounts/passwords";
import {
  adminFindUsers,
  adminListUsers,
  adminRebuildIndex,
  adminSetBanned,
  adminUnlock,
  changeEmail,
  changePassword,
  confirmEmail,
  createVerifyToken,
  deleteAccount,
  getRules,
  isAdmin,
  login,
  maskEmail,
  normalizeEmail,
  normalizeUsername,
  register,
  requestRecovery,
  resetPassword,
  saveRules,
  sessionUser,
} from "@/lib/accounts/service";
import { cookieValue, createSession, readSession } from "@/lib/accounts/session";

/** Almacén en memoria para las pruebas. */
class MemoryKV implements KV {
  readonly kind = "file" as const;
  data = new Map<string, string>();
  async get(k: string) {
    return this.data.get(k) ?? null;
  }
  async set(k: string, v: string, o: { nx?: boolean } = {}) {
    if (o.nx && this.data.has(k)) return false;
    this.data.set(k, v);
    return true;
  }
  async del(...ks: string[]) {
    for (const k of ks) this.data.delete(k);
  }
  async incr(k: string) {
    const n = Number(this.data.get(k) ?? 0) + 1;
    this.data.set(k, String(n));
    return n;
  }
  async getdel(k: string) {
    const v = this.data.get(k) ?? null;
    this.data.delete(k);
    return v;
  }
  private zset(k: string): Record<string, number> {
    return JSON.parse(this.data.get(k) ?? "{}") as Record<string, number>;
  }
  async zadd(k: string, score: number, m: string) {
    this.data.set(k, JSON.stringify({ ...this.zset(k), [m]: score }));
  }
  async zrem(k: string, m: string) {
    const z = this.zset(k);
    delete z[m];
    if (Object.keys(z).length) this.data.set(k, JSON.stringify(z));
    else this.data.delete(k);
  }
  async zcard(k: string) {
    return Object.keys(this.zset(k)).length;
  }
  async zrevrange(k: string, start: number, stop: number) {
    return Object.entries(this.zset(k))
      .sort((a, b) => b[1] - a[1])
      .slice(start, stop + 1)
      .map(([m]) => m);
  }
  async lpush(k: string, v: string, max: number) {
    this.data.set(k, JSON.stringify([v, ...(JSON.parse(this.data.get(k) ?? "[]") as string[])].slice(0, max)));
  }
  async lrange(k: string, start: number, stop: number) {
    return (JSON.parse(this.data.get(k) ?? "[]") as string[]).slice(start, stop + 1);
  }
  async keys(prefix: string, limit: number) {
    return [...this.data.keys()].filter((k) => k.startsWith(prefix)).slice(0, limit);
  }
}

// Contraseña de prueba generada para estas pruebas (no es de nadie).
const PASS = "prueba-larga-7f3k";
const MAIL = "prueba@example.com";
const RULE = { id: "r1", hotel: "es", item: "throne", mode: "below_avg", value: 20, name: "Trono", t: "r", r: 1, createdAt: 1 };

describe("contraseñas", () => {
  it("se guardan cifradas con sal distinta y se verifican", async () => {
    const a = await hashPassword(PASS);
    const b = await hashPassword(PASS);
    expect(a).not.toContain(PASS);
    expect(a).not.toBe(b);
    expect(await verifyPassword(PASS, a)).toBe(true);
    expect(await verifyPassword("otra-cosa-larga", a)).toBe(false);
    expect(await verifyPassword(PASS, "basura")).toBe(false);
  });

  it("piden un mínimo razonable", () => {
    expect(passwordProblem("corta", "luciano")).toBe("short");
    expect(passwordProblem("1234567890", "luciano")).toBe("common");
    expect(passwordProblem("aaaaaaaaaaaa", "luciano")).toBe("common");
    expect(passwordProblem("luciano-es-genial", "Luciano")).toBe("has_username");
    expect(passwordProblem(PASS, "luciano")).toBeNull();
  });
});

describe("sesión firmada", () => {
  it("no se puede falsificar ni usar vencida", () => {
    const token = createSession("luciano", 1, "clave-secreta-de-prueba-0123456789", 1000);
    expect(readSession(token, "clave-secreta-de-prueba-0123456789", 2000)).toMatchObject({ u: "luciano", v: 1 });
    expect(readSession(token, "otra-clave-0123456789-0123456789", 2000)).toBeNull();
    const [payload, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ u: "admin", v: 1, exp: 9e15 })).toString("base64url");
    expect(readSession(`${forged}.${sig}`, "clave-secreta-de-prueba-0123456789", 2000)).toBeNull();
    expect(readSession(`${payload}.${sig}`, "clave-secreta-de-prueba-0123456789", 1000 + 31 * 86_400_000)).toBeNull();
    expect(cookieValue("a=1; bm_session=xyz; b=2", "bm_session")).toBe("xyz");
  });
});

describe("cuentas", () => {
  it("registro, inicio de sesión y lista de alertas", async () => {
    const kv = new MemoryKV();
    expect(normalizeUsername(" Luciano_97 ")).toBe("luciano_97");
    expect(normalizeUsername("ab")).toBeNull();
    expect(normalizeUsername("<script>")).toBeNull();
    const reg = await register(kv, "Luciano_97", "Luciano@Example.com ", PASS, "1.1.1.1");
    expect(reg.ok).toBe(true);
    expect((await register(kv, "luciano_97", MAIL, PASS, "1.1.1.2")) as unknown).toMatchObject({ ok: false, error: "taken" });
    expect(await register(kv, "Admin", MAIL, PASS, "1.1.1.3")).toMatchObject({ ok: false, error: "reserved_username" });
    expect(await register(kv, "nuevo", MAIL, "corta", "1.1.1.3")).toMatchObject({ ok: false, error: "short" });
    // Lo guardado no contiene la contraseña.
    expect([...kv.data.values()].join(" ")).not.toContain(PASS);

    expect(await login(kv, "LUCIANO_97", PASS, "2.2.2.2")).toMatchObject({ ok: true, value: { u: "luciano_97" } });
    expect(await login(kv, "luciano_97", "incorrecta-1234", "2.2.2.2")).toMatchObject({ ok: false, error: "bad_credentials" });
    expect(await login(kv, "no_existe", PASS, "2.2.2.2")).toMatchObject({ ok: false, error: "bad_credentials" });

    await saveRules(kv, "luciano_97", [RULE, { ...RULE, id: "x", item: "<img onerror=alert(1)>" }]);
    expect(await getRules(kv, "luciano_97")).toEqual([RULE]);
  });

  it("bloquea a quien prueba muchas contraseñas, sin dejar afuera al dueño", async () => {
    const kv = new MemoryKV();
    await register(kv, "victima", MAIL, PASS, "1.1.1.1");
    for (let i = 0; i < 10; i++) await login(kv, "victima", `mala-clave-${i}xx`, "3.3.3.3");
    // Desde esa conexión ya no se puede, ni con la contraseña correcta.
    expect(await login(kv, "victima", PASS, "3.3.3.3")).toMatchObject({ ok: false, error: "locked" });
    // El dueño, desde su conexión, sí entra.
    expect(await login(kv, "victima", PASS, "4.4.4.4")).toMatchObject({ ok: true });
    // Un ataque desde muchas conexiones bloquea la cuenta un rato...
    for (let i = 0; i < 100; i++) await login(kv, "victima", `mala-clave-${i}xx`, `5.5.${i >> 4}.${i & 15}`);
    expect(await login(kv, "victima", PASS, "4.4.4.4")).toMatchObject({ ok: false, error: "locked" });
    // ...hasta que alguien de administración lo destraba.
    await adminUnlock(kv, "victima");
    expect(await login(kv, "victima", PASS, "4.4.4.4")).toMatchObject({ ok: true });
  });

  it("frena muchos intentos desde una misma conexión", async () => {
    const kv = new MemoryKV();
    for (let i = 0; i < 30; i++) await login(kv, `nadie${i}`, PASS, "6.6.6.6");
    expect(await login(kv, "otro_mas", PASS, "6.6.6.6")).toMatchObject({ ok: false, error: "rate_limited" });
    for (let i = 0; i < 5; i++) await register(kv, `nuevo${i}`, MAIL, PASS, "7.7.7.7");
    expect(await register(kv, "nuevo9", MAIL, PASS, "7.7.7.7")).toMatchObject({ ok: false, error: "rate_limited" });
  });

  it("cambiar la contraseña cierra las otras sesiones; borrar la cuenta borra todo", async () => {
    const kv = new MemoryKV();
    await register(kv, "pepe", MAIL, PASS, "1.1.1.1");
    await saveRules(kv, "pepe", [RULE]);
    expect(await sessionUser(kv, "pepe", 1)).not.toBeNull();
    expect(await changePassword(kv, "pepe", "incorrecta-1234", "otra-clave-larga-2")).toMatchObject({ ok: false });
    expect(await changePassword(kv, "pepe", PASS, "otra-clave-larga-2")).toMatchObject({ ok: true, value: { ver: 2 } });
    expect(await sessionUser(kv, "pepe", 1)).toBeNull();
    expect(await deleteAccount(kv, "pepe", PASS)).toMatchObject({ ok: false });
    expect(await deleteAccount(kv, "pepe", "otra-clave-larga-2")).toMatchObject({ ok: true });
    expect(kv.data.size).toBe(1); // solo queda el contador de registros por IP
  });
});

describe("email y recuperación", () => {
  it("valida y oculta emails", () => {
    expect(normalizeEmail(" Lucas@Gmail.COM ")).toBe("lucas@gmail.com");
    expect(normalizeEmail("sin-arroba")).toBeNull();
    expect(normalizeEmail("a@b")).toBeNull();
    expect(normalizeEmail('x"<script>@a.com')).toBeNull();
    expect(normalizeEmail(`${"a".repeat(250)}@a.com`)).toBeNull();
    expect(maskEmail("lucas@gmail.com")).toBe("lu***@gmail.com");
  });

  it("el registro pide email y la confirmación es de un solo uso", async () => {
    const kv = new MemoryKV();
    expect(await register(kv, "sinmail", "", PASS, "1.1.1.1")).toMatchObject({ ok: false, error: "invalid_email" });
    await register(kv, "lucas", MAIL, PASS, "1.1.1.1");
    const token = (await createVerifyToken(kv, "lucas", MAIL))!;
    // El enlace se guarda como huella: el token no queda en la base.
    expect([...kv.data.keys(), ...kv.data.values()].join(" ")).not.toContain(token);
    expect(await confirmEmail(kv, token)).toMatchObject({ ok: true, value: { user: { emailVerified: true } } });
    expect(await confirmEmail(kv, token)).toMatchObject({ ok: false, error: "invalid_token" });
    expect(await confirmEmail(kv, "inventado")).toMatchObject({ ok: false, error: "invalid_token" });
  });

  it("no se pueden pedir correos sin fin", async () => {
    const kv = new MemoryKV();
    await register(kv, "lucas", MAIL, PASS, "1.1.1.1");
    for (let i = 0; i < 5; i++) expect(await createVerifyToken(kv, "lucas", MAIL)).not.toBeNull();
    expect(await createVerifyToken(kv, "lucas", MAIL)).toBeNull();
  });

  it("cambiar el email pide la contraseña y anula la confirmación anterior", async () => {
    const kv = new MemoryKV();
    await register(kv, "lucas", MAIL, PASS, "1.1.1.1");
    const old = (await createVerifyToken(kv, "lucas", MAIL))!;
    expect(await changeEmail(kv, "lucas", "incorrecta-1234", "nuevo@example.com")).toMatchObject({ ok: false, error: "bad_credentials" });
    expect(await changeEmail(kv, "lucas", PASS, "nuevo@example.com")).toMatchObject({
      ok: true,
      value: { email: "nuevo@example.com", emailVerified: false },
    });
    expect(await confirmEmail(kv, old)).toMatchObject({ ok: false, error: "invalid_token" });
    expect(await adminFindUsers(kv, MAIL)).toEqual([]);
    expect(await adminFindUsers(kv, "nuevo@example.com")).toMatchObject([{ u: "lucas" }]);
  });

  it("recuperar: solo con email confirmado, enlace de un solo uso que cierra las otras sesiones", async () => {
    const kv = new MemoryKV();
    await register(kv, "lucas", MAIL, PASS, "1.1.1.1");
    await register(kv, "lucas_2", MAIL, PASS, "1.1.1.1");
    // Sin confirmar el email no se manda nada (y la respuesta es igual).
    expect(await requestRecovery(kv, MAIL, "2.2.2.2")).toMatchObject({ ok: true, value: { accounts: [] } });
    await confirmEmail(kv, (await createVerifyToken(kv, "lucas", MAIL))!);
    await confirmEmail(kv, (await createVerifyToken(kv, "lucas_2", MAIL))!);
    // Un email que no existe responde igual que uno que sí.
    expect(await requestRecovery(kv, "nadie@example.com", "2.2.2.2")).toMatchObject({ ok: true, value: { accounts: [] } });
    const rec = await requestRecovery(kv, MAIL.toUpperCase(), "2.2.2.2");
    if (!rec.ok) throw new Error("falló");
    expect(rec.value.accounts.map((a) => a.name).sort()).toEqual(["lucas", "lucas_2"]);
    const token = rec.value.accounts.find((a) => a.name === "lucas")!.token;
    expect(await resetPassword(kv, token, "corta")).toMatchObject({ ok: false, error: "short" });
    expect(await resetPassword(kv, token, "clave-nueva-larga-9")).toMatchObject({ ok: true, value: { u: "lucas", user: { ver: 2 } } });
    expect(await resetPassword(kv, token, "otra-clave-larga-9")).toMatchObject({ ok: false, error: "invalid_token" });
    expect(await sessionUser(kv, "lucas", 1)).toBeNull();
    expect(await login(kv, "lucas", "clave-nueva-larga-9", "3.3.3.3")).toMatchObject({ ok: true });
  });

  it("el enlace de recuperación deja de servir si se cambió el email", async () => {
    const kv = new MemoryKV();
    await register(kv, "lucas", MAIL, PASS, "1.1.1.1");
    await confirmEmail(kv, (await createVerifyToken(kv, "lucas", MAIL))!);
    const rec = await requestRecovery(kv, MAIL, "2.2.2.2");
    if (!rec.ok) throw new Error("falló");
    await changeEmail(kv, "lucas", PASS, "nuevo@example.com");
    expect(await resetPassword(kv, rec.value.accounts[0].token, "clave-nueva-larga-9")).toMatchObject({ ok: false, error: "invalid_token" });
  });

  it("limita los pedidos de recuperación por email y por conexión", async () => {
    const kv = new MemoryKV();
    await register(kv, "lucas", MAIL, PASS, "1.1.1.1");
    await confirmEmail(kv, (await createVerifyToken(kv, "lucas", MAIL))!);
    for (let i = 0; i < 3; i++) await requestRecovery(kv, MAIL, `2.2.2.${i}`);
    // El 4.º en la hora no manda nada, sin avisar (para no confirmar que el email existe).
    expect(await requestRecovery(kv, MAIL, "2.2.2.9")).toMatchObject({ ok: true, value: { accounts: [] } });
    for (let i = 0; i < 10; i++) await requestRecovery(kv, `x${i}@example.com`, "8.8.8.8");
    expect(await requestRecovery(kv, MAIL, "8.8.8.8")).toMatchObject({ ok: false, error: "rate_limited" });
  });

  it("los correos escapan los datos y usan el enlace tal cual", () => {
    const link = "https://ejemplo.com/cuenta/verificar?token=abc";
    const v = verifyEmail("es", MAIL, '<img src=x onerror="alert(1)">', link);
    expect(v.html).not.toContain("<img");
    expect(v.html).toContain("&lt;img");
    expect(v.text).toContain(link);
    const r = resetEmail("pt", MAIL, [{ name: "lucas", link }]);
    expect(r.subject).toContain("Recuperar");
    expect(r.html).toContain('href="https://ejemplo.com/cuenta/verificar?token=abc"');
    expect(mailEnabled({})).toBe(false);
    expect(mailEnabled({ ACCOUNTS_DEV_STORE: "1" })).toBe(true);
    expect(mailEnabled({ ACCOUNTS_DEV_STORE: "1", VERCEL: "1" })).toBe(false);
  });
});

describe("auditoría de seguridad", () => {
  it("una sesión robada no sirve para adivinar la contraseña", async () => {
    const kv = new MemoryKV();
    await register(kv, "lucas", MAIL, PASS, "1.1.1.1");
    for (let i = 0; i < 10; i++) await changeEmail(kv, "lucas", `mala-clave-${i}xx`, "ladron@example.com", "9.9.9.9");
    // Ya ni con la contraseña correcta desde esa conexión: hay que esperar.
    expect(await changeEmail(kv, "lucas", PASS, "ladron@example.com", "9.9.9.9")).toMatchObject({ ok: false, error: "locked" });
    expect(await changePassword(kv, "lucas", PASS, "otra-clave-larga-2", "9.9.9.9")).toMatchObject({ ok: false, error: "locked" });
    expect(await deleteAccount(kv, "lucas", PASS, "9.9.9.9")).toMatchObject({ ok: false, error: "locked" });
    expect((await adminFindUsers(kv, MAIL))[0]).toMatchObject({ u: "lucas" });
  });

  it("nadie puede llenarle la casilla a otra persona con registros", async () => {
    const kv = new MemoryKV();
    const victim = "victima@example.com";
    let sent = 0;
    for (let i = 0; i < 8; i++) {
      const reg = await register(kv, `cuenta${i}`, victim, PASS, `10.0.0.${i}`);
      if (reg.ok && (await createVerifyToken(kv, reg.value.u, victim))) sent++;
    }
    expect(sent).toBe(5);
  });

  it("con correos activos, el panel pide el email confirmado", () => {
    const user = { name: "luciano", hash: "x", createdAt: 1, ver: 1, email: MAIL, emailVerified: false };
    const smtp = { ADMIN_USERS: "luciano", SMTP_HOST: "smtp.example.com", SMTP_USER: "u", SMTP_PASS: "p", MAIL_FROM: "a@example.com" };
    expect(canAdmin("luciano", user, { ADMIN_USERS: "luciano" })).toBe(true);
    expect(canAdmin("luciano", user, smtp)).toBe(false);
    expect(canAdmin("luciano", { ...user, emailVerified: true }, smtp)).toBe(true);
    expect(canAdmin("otro", { ...user, emailVerified: true }, smtp)).toBe(false);
  });
});

describe("administración", () => {
  it("solo las cuentas de ADMIN_USERS", () => {
    expect(isAdmin("luciano", {})).toBe(false);
    expect(isAdmin("luciano", { ADMIN_USERS: " Luciano , otro" })).toBe(true);
    expect(isAdmin("otr", { ADMIN_USERS: "otro" })).toBe(false);
  });

  it("lista, bloquea y reconstruye el índice", async () => {
    const kv = new MemoryKV();
    await register(kv, "uno", MAIL, PASS, "1.1.1.1");
    await register(kv, "dos", "dos@example.com", PASS, "1.1.1.2");
    const list = await adminListUsers(kv, 0, 10);
    expect(list.total).toBe(2);
    expect(list.rows.map((r) => r.email)).toContain("pr***@example.com");
    expect(JSON.stringify(list)).not.toContain("scrypt");
    // Bloquear cierra la sesión y no deja entrar.
    await adminSetBanned(kv, "uno", true);
    expect(await sessionUser(kv, "uno", 1)).toBeNull();
    expect(await login(kv, "uno", PASS, "2.2.2.2")).toMatchObject({ ok: false, error: "banned" });
    // Con una contraseña incorrecta no se revela el bloqueo.
    expect(await login(kv, "uno", "incorrecta-1234", "2.2.2.2")).toMatchObject({ ok: false, error: "bad_credentials" });
    await adminSetBanned(kv, "uno", false);
    expect(await login(kv, "uno", PASS, "2.2.2.2")).toMatchObject({ ok: true });
    kv.data.delete("users");
    expect(await adminRebuildIndex(kv)).toBe(2);
    expect((await adminListUsers(kv, 0, 10)).total).toBe(2);
  });
});

describe("configuración", () => {
  it("el almacén de prueba nunca se usa en Vercel y el token solo va a Upstash", () => {
    expect(accountsEnabled({})).toBe(false);
    expect(accountsEnabled({ ACCOUNTS_DEV_STORE: "1" })).toBe(true);
    expect(accountsEnabled({ ACCOUNTS_DEV_STORE: "1", VERCEL: "1" })).toBe(false);
    expect(accountsEnabled({ KV_REST_API_URL: "https://otro-sitio.com", KV_REST_API_TOKEN: "t" })).toBe(false);
    expect(accountsEnabled({ KV_REST_API_URL: "http://x.upstash.io", KV_REST_API_TOKEN: "t" })).toBe(false);
    expect(accountsEnabled({ KV_REST_API_URL: "https://ok-1234.upstash.io", KV_REST_API_TOKEN: "t" })).toBe(true);
    expect(sessionKeyMaterial({ ACCOUNTS_DEV_STORE: "1", VERCEL: "1" })).toBeNull();
  });

  it("el cliente de Upstash usa la API REST con el token", async () => {
    const fetchImpl = vi.fn(async () => Response.json([{ result: "OK" }]));
    const kv = new UpstashKV("https://ok-1234.upstash.io", "token-de-prueba", fetchImpl as never);
    expect(await kv.set("user:a", "{}", { nx: true })).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://ok-1234.upstash.io/pipeline");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer token-de-prueba");
    expect(JSON.parse(String(init.body))).toEqual([["SET", "user:a", "{}", "NX"]]);
  });
});
