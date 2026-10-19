import { parseStoredRules, type StoredRule } from "@/lib/alerts/rules";
import type { KV } from "./kv";
import { dummyHash, hashPassword, passwordProblem, verifyPassword, type PasswordProblem } from "./passwords";

/**
 * Cuentas con usuario y contraseña. Se guarda solo: nombre, contraseña cifrada,
 * fecha de creación, versión de la sesión y la lista de alertas. No hay email.
 */

export type AccountError =
  | "invalid_username"
  | "reserved_username"
  | PasswordProblem
  | "taken"
  | "bad_credentials"
  | "locked"
  | "rate_limited"
  | "too_many_rules";

export interface UserRecord {
  name: string;
  hash: string;
  createdAt: number;
  ver: number;
}

type Result<T> = { ok: true; value: T } | { ok: false; error: AccountError };

const USERNAME = /^[A-Za-z0-9_.-]{3,20}$/;
/** Nombres que se podrían usar para hacerse pasar por el sitio o por el equipo. */
const RESERVED = /^(admin|administrador|administrator|root|staff|mod|moderador|moderator|bomhams|bomhamsmarket|habbo|sulake|soporte|support|system|sistema)$/;

const LOGIN_FAILS = { max: 10, windowSec: 15 * 60 };
const IP_ATTEMPTS = { max: 30, windowSec: 15 * 60 };
const IP_SIGNUPS = { max: 5, windowSec: 60 * 60 };

const keys = {
  user: (u: string) => `user:${u}`,
  rules: (u: string) => `rules:${u}`,
  fails: (u: string) => `fails:${u}`,
  ipAttempts: (ip: string) => `ip:attempts:${ip}`,
  ipSignups: (ip: string) => `ip:signups:${ip}`,
};

/** Usuario en minúsculas para usar como clave, o null si no es válido. */
export function normalizeUsername(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const trimmed = name.trim();
  return USERNAME.test(trimmed) ? trimmed.toLowerCase() : null;
}

async function readUser(kv: KV, u: string): Promise<UserRecord | null> {
  const raw = await kv.get(keys.user(u));
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as UserRecord;
    return typeof r.hash === "string" && typeof r.name === "string" ? { ...r, ver: Number(r.ver) || 1 } : null;
  } catch {
    return null;
  }
}

export async function register(kv: KV, name: unknown, password: unknown, ip: string): Promise<Result<{ u: string; user: UserRecord }>> {
  const u = normalizeUsername(name);
  if (!u) return { ok: false, error: "invalid_username" };
  if (RESERVED.test(u.replace(/[._-]/g, ""))) return { ok: false, error: "reserved_username" };
  if (typeof password !== "string") return { ok: false, error: "short" };
  const problem = passwordProblem(password, u);
  if (problem) return { ok: false, error: problem };
  if ((await kv.incr(keys.ipSignups(ip), IP_SIGNUPS.windowSec)) > IP_SIGNUPS.max) return { ok: false, error: "rate_limited" };
  const user: UserRecord = { name: String(name).trim(), hash: await hashPassword(password), createdAt: Date.now(), ver: 1 };
  // NX: si dos personas eligen el mismo nombre a la vez, gana una sola.
  if (!(await kv.set(keys.user(u), JSON.stringify(user), { nx: true }))) return { ok: false, error: "taken" };
  return { ok: true, value: { u, user } };
}

export async function login(kv: KV, name: unknown, password: unknown, ip: string): Promise<Result<{ u: string; user: UserRecord }>> {
  if ((await kv.incr(keys.ipAttempts(ip), IP_ATTEMPTS.windowSec)) > IP_ATTEMPTS.max) return { ok: false, error: "rate_limited" };
  const u = normalizeUsername(name);
  if (!u || typeof password !== "string" || password.length > 128) {
    await verifyPassword("x", await dummyHash());
    return { ok: false, error: "bad_credentials" };
  }
  const fails = Number((await kv.get(keys.fails(u))) ?? 0);
  if (fails >= LOGIN_FAILS.max) return { ok: false, error: "locked" };
  const user = await readUser(kv, u);
  const ok = await verifyPassword(password, user?.hash ?? (await dummyHash()));
  if (!user || !ok) {
    if (user) await kv.incr(keys.fails(u), LOGIN_FAILS.windowSec);
    return { ok: false, error: "bad_credentials" };
  }
  await kv.del(keys.fails(u));
  return { ok: true, value: { u, user } };
}

/** La cuenta de una sesión, si sigue existiendo y la sesión no quedó vieja (cambio de contraseña). */
export async function sessionUser(kv: KV, u: string, ver: number): Promise<UserRecord | null> {
  const user = await readUser(kv, u);
  return user && user.ver === ver ? user : null;
}

export async function getRules(kv: KV, u: string): Promise<StoredRule[]> {
  const raw = await kv.get(keys.rules(u));
  if (!raw) return [];
  try {
    return parseStoredRules(JSON.parse(raw));
  } catch {
    return [];
  }
}

export async function saveRules(kv: KV, u: string, raw: unknown): Promise<Result<StoredRule[]>> {
  if (Array.isArray(raw) && raw.length > 100) return { ok: false, error: "too_many_rules" };
  const rules = parseStoredRules(raw);
  await kv.set(keys.rules(u), JSON.stringify(rules));
  return { ok: true, value: rules };
}

export async function changePassword(kv: KV, u: string, current: unknown, next: unknown): Promise<Result<UserRecord>> {
  const user = await readUser(kv, u);
  if (!user || typeof current !== "string" || !(await verifyPassword(current, user.hash))) return { ok: false, error: "bad_credentials" };
  if (typeof next !== "string") return { ok: false, error: "short" };
  const problem = passwordProblem(next, u);
  if (problem) return { ok: false, error: problem };
  // Subir la versión cierra las sesiones abiertas en otros dispositivos.
  const updated: UserRecord = { ...user, hash: await hashPassword(next), ver: user.ver + 1 };
  await kv.set(keys.user(u), JSON.stringify(updated));
  return { ok: true, value: updated };
}

export async function deleteAccount(kv: KV, u: string, password: unknown): Promise<Result<true>> {
  const user = await readUser(kv, u);
  if (!user || typeof password !== "string" || !(await verifyPassword(password, user.hash))) return { ok: false, error: "bad_credentials" };
  await kv.del(keys.user(u), keys.rules(u), keys.fails(u));
  return { ok: true, value: true };
}
