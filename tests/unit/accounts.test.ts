import { describe, expect, it, vi } from "vitest";
import { accountsEnabled, sessionKeyMaterial, UpstashKV, type KV } from "@/lib/accounts/kv";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/accounts/passwords";
import { changePassword, deleteAccount, getRules, login, normalizeUsername, register, saveRules, sessionUser } from "@/lib/accounts/service";
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
}

// Contraseña de prueba generada para estas pruebas (no es de nadie).
const PASS = "prueba-larga-7f3k";
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
    const reg = await register(kv, "Luciano_97", PASS, "1.1.1.1");
    expect(reg.ok).toBe(true);
    expect((await register(kv, "luciano_97", PASS, "1.1.1.2")) as unknown).toMatchObject({ ok: false, error: "taken" });
    expect(await register(kv, "Admin", PASS, "1.1.1.3")).toMatchObject({ ok: false, error: "reserved_username" });
    expect(await register(kv, "nuevo", "corta", "1.1.1.3")).toMatchObject({ ok: false, error: "short" });
    // Lo guardado no contiene la contraseña.
    expect([...kv.data.values()].join(" ")).not.toContain(PASS);

    expect(await login(kv, "LUCIANO_97", PASS, "2.2.2.2")).toMatchObject({ ok: true, value: { u: "luciano_97" } });
    expect(await login(kv, "luciano_97", "incorrecta-1234", "2.2.2.2")).toMatchObject({ ok: false, error: "bad_credentials" });
    expect(await login(kv, "no_existe", PASS, "2.2.2.2")).toMatchObject({ ok: false, error: "bad_credentials" });

    await saveRules(kv, "luciano_97", [RULE, { ...RULE, id: "x", item: "<img onerror=alert(1)>" }]);
    expect(await getRules(kv, "luciano_97")).toEqual([RULE]);
  });

  it("bloquea después de muchos intentos fallidos", async () => {
    const kv = new MemoryKV();
    await register(kv, "victima", PASS, "1.1.1.1");
    for (let i = 0; i < 10; i++) await login(kv, "victima", `mala-clave-${i}xx`, `3.3.3.${i}`);
    expect(await login(kv, "victima", PASS, "4.4.4.4")).toMatchObject({ ok: false, error: "locked" });
  });

  it("cambiar la contraseña cierra las otras sesiones; borrar la cuenta borra todo", async () => {
    const kv = new MemoryKV();
    await register(kv, "pepe", PASS, "1.1.1.1");
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
