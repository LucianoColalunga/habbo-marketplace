import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Almacén clave-valor para las cuentas.
 *  - Producción: Upstash Redis por su API REST (la integración gratuita de
 *    Vercel agrega KV_REST_API_URL y KV_REST_API_TOKEN, o UPSTASH_REDIS_REST_*).
 *  - Pruebas locales: un archivo JSON en .data/, solo con ACCOUNTS_DEV_STORE=1 y nunca en Vercel.
 * Sin ninguno de los dos, las cuentas quedan apagadas y la web funciona igual.
 */
export interface KV {
  readonly kind: "upstash" | "file";
  get(key: string): Promise<string | null>;
  /** Con `nx`, solo guarda si la clave no existe; devuelve si guardó. */
  set(key: string, value: string, opts?: { nx?: boolean; exSeconds?: number }): Promise<boolean>;
  del(...keys: string[]): Promise<void>;
  /** Suma 1 y devuelve el valor; la clave vence a los `exSeconds` del primer aumento. */
  incr(key: string, exSeconds: number): Promise<number>;
}

type Env = Record<string, string | undefined>;

function upstashConfig(env: Env): { url: string; token: string } | null {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const u = new URL(url);
    // Solo HTTPS y dominios de Upstash: nunca se manda el token a otro lado.
    if (u.protocol !== "https:" || !/(^|\.)upstash\.io$/.test(u.hostname)) return null;
    return { url: u.origin, token };
  } catch {
    return null;
  }
}

/** El almacén de prueba (archivo) nunca se usa en Vercel, aunque alguien ponga la variable por error. */
function devStore(env: Env): boolean {
  return env.ACCOUNTS_DEV_STORE === "1" && !env.VERCEL;
}

export function accountsEnabled(env: Env = process.env): boolean {
  return upstashConfig(env) !== null || devStore(env);
}

export class UpstashKV implements KV {
  readonly kind = "upstash" as const;
  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async pipeline(commands: (string | number)[][]): Promise<unknown[]> {
    const res = await this.fetchImpl(`${this.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Upstash respondió ${res.status}`);
    const body = (await res.json()) as { result?: unknown; error?: string }[];
    return body.map((r) => {
      if (r.error) throw new Error(`Upstash: ${r.error}`);
      return r.result;
    });
  }

  async get(key: string) {
    const [r] = await this.pipeline([["GET", key]]);
    return typeof r === "string" ? r : null;
  }

  async set(key: string, value: string, opts: { nx?: boolean; exSeconds?: number } = {}) {
    const cmd: (string | number)[] = ["SET", key, value];
    if (opts.nx) cmd.push("NX");
    if (opts.exSeconds) cmd.push("EX", opts.exSeconds);
    const [r] = await this.pipeline([cmd]);
    return r === "OK";
  }

  async del(...keys: string[]) {
    if (keys.length) await this.pipeline([["DEL", ...keys]]);
  }

  async incr(key: string, exSeconds: number) {
    const [n] = await this.pipeline([
      ["INCR", key],
      ["EXPIRE", key, exSeconds, "NX"],
    ]);
    return Number(n);
  }
}

/** Solo para probar en la PC: guarda todo en un archivo. */
export class FileKV implements KV {
  readonly kind = "file" as const;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly file: string) {}

  private async load(): Promise<Record<string, { v: string; exp?: number }>> {
    try {
      const data = JSON.parse(await readFile(this.file, "utf8")) as Record<string, { v: string; exp?: number }>;
      const now = Date.now();
      for (const [k, e] of Object.entries(data)) if (e.exp && e.exp < now) delete data[k];
      return data;
    } catch {
      return {};
    }
  }

  private async save(data: Record<string, { v: string; exp?: number }>) {
    await mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    await writeFile(tmp, JSON.stringify(data));
    await rename(tmp, this.file);
  }

  /** Una operación a la vez, para no pisar el archivo. */
  private run<T>(fn: (data: Record<string, { v: string; exp?: number }>) => Promise<T> | T, write: boolean): Promise<T> {
    const next = this.queue.then(async () => {
      const data = await this.load();
      const out = await fn(data);
      if (write) await this.save(data);
      return out;
    });
    this.queue = next.catch(() => undefined);
    return next;
  }

  get(key: string) {
    return this.run((d) => d[key]?.v ?? null, false);
  }

  set(key: string, value: string, opts: { nx?: boolean; exSeconds?: number } = {}) {
    return this.run((d) => {
      if (opts.nx && d[key]) return false;
      d[key] = { v: value, ...(opts.exSeconds ? { exp: Date.now() + opts.exSeconds * 1000 } : {}) };
      return true;
    }, true);
  }

  del(...keys: string[]) {
    return this.run((d) => {
      for (const k of keys) delete d[k];
    }, true);
  }

  incr(key: string, exSeconds: number) {
    return this.run((d) => {
      const n = Number(d[key]?.v ?? 0) + 1;
      d[key] = { v: String(n), exp: d[key]?.exp ?? Date.now() + exSeconds * 1000 };
      return n;
    }, true);
  }
}

let cached: KV | null | undefined;

export function getKV(env: Env = process.env): KV | null {
  if (cached !== undefined) return cached;
  const up = upstashConfig(env);
  if (up) cached = new UpstashKV(up.url, up.token);
  else if (devStore(env)) cached = new FileKV(path.join(env.DATA_DIR || ".data", "accounts-dev.json"));
  else cached = null;
  return cached;
}

/** Clave para firmar la sesión: SESSION_SECRET o, si no está, derivada del token de la base. */
export function sessionKeyMaterial(env: Env = process.env): string | null {
  if (env.SESSION_SECRET && env.SESSION_SECRET.length >= 32) return env.SESSION_SECRET;
  const up = upstashConfig(env);
  if (up) return `bm-session:${up.token}`;
  if (devStore(env)) return "solo-para-pruebas-locales-no-usar-en-produccion";
  return null;
}
