import { createHash, randomBytes } from "node:crypto";
import { parseStoredRules, type StoredRule } from "@/lib/alerts/rules";
import type { KV } from "./kv";
import { dummyHash, hashPassword, passwordProblem, verifyPassword, type PasswordProblem } from "./passwords";

/**
 * Cuentas con usuario, email y contraseña. Se guarda solo: nombre, email,
 * contraseña cifrada, fechas, versión de la sesión y la lista de alertas.
 * El email sirve únicamente para confirmar que es tuyo y recuperar la cuenta.
 */

export type AccountError =
  | "invalid_username"
  | "reserved_username"
  | "invalid_email"
  | PasswordProblem
  | "taken"
  | "bad_credentials"
  | "locked"
  | "banned"
  | "rate_limited"
  | "too_many_rules"
  | "invalid_token";

export interface UserRecord {
  name: string;
  hash: string;
  createdAt: number;
  ver: number;
  email?: string;
  emailVerified?: boolean;
  banned?: boolean;
  lastLoginAt?: number;
  /** Plan de la cuenta: sin el campo es Standard (gratis). El VIP lo da la administración. */
  plan?: "vip";
}

export type Plan = "standard" | "vip";

export function planOf(user: Pick<UserRecord, "plan"> | null | undefined): Plan {
  return user?.plan === "vip" ? "vip" : "standard";
}

type Result<T> = { ok: true; value: T } | { ok: false; error: AccountError };

const USERNAME = /^[A-Za-z0-9_.-]{3,20}$/;
/** Nombres que se podrían usar para hacerse pasar por el sitio o por el equipo. */
const RESERVED = /^(admin|administrador|administrator|root|staff|mod|moderador|moderator|bomhams|bomhamsmarket|stats|habbo|sulake|soporte|support|system|sistema)$/;

const LIMITS = {
  /** Intentos fallidos de una cuenta desde una misma conexión. */
  failsPerIp: { max: 10, windowSec: 15 * 60 },
  /** Intentos fallidos de una cuenta en total (ataques desde muchas conexiones). */
  failsTotal: { max: 100, windowSec: 15 * 60 },
  ipAttempts: { max: 30, windowSec: 15 * 60 },
  ipSignups: { max: 5, windowSec: 60 * 60 },
  ipRecovery: { max: 10, windowSec: 60 * 60 },
  emailRecovery: { max: 3, windowSec: 60 * 60 },
  verifyMails: { max: 5, windowSec: 60 * 60 },
  /** Correos de confirmación a una misma dirección (aunque sean de cuentas distintas). */
  verifyMailsTo: { max: 5, windowSec: 60 * 60 },
};
const TOKEN_TTL = { verify: 24 * 3600, reset: 3600 };

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

const keys = {
  user: (u: string) => `user:${u}`,
  rules: (u: string) => `rules:${u}`,
  users: () => "users",
  email: (email: string) => `email:${sha(email)}`,
  failsIp: (u: string, ip: string) => `fails:${u}:${sha(ip).slice(0, 16)}`,
  failsTotal: (u: string) => `fails:${u}`,
  ipAttempts: (ip: string) => `ip:attempts:${ip}`,
  ipSignups: (ip: string) => `ip:signups:${ip}`,
  ipRecovery: (ip: string) => `ip:recovery:${ip}`,
  emailRecovery: (email: string) => `recovery:${sha(email)}`,
  verifyMails: (u: string) => `verifymails:${u}`,
  verifyMailsTo: (email: string) => `verifyto:${sha(email)}`,
  verifyToken: (t: string) => `verify:${sha(t)}`,
  resetToken: (t: string) => `reset:${sha(t)}`,
  adminLog: () => "admin:log",
};

/** Usuario en minúsculas para usar como clave, o null si no es válido. */
export function normalizeUsername(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const trimmed = name.trim();
  return USERNAME.test(trimmed) ? trimmed.toLowerCase() : null;
}

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@<>()"',;:\\]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) return null;
  return email;
}

/** "lucas@gmail.com" → "lu***@gmail.com" (para mostrar sin exponer el email completo). */
export function maskEmail(email: string | undefined): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
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

async function writeUser(kv: KV, u: string, user: UserRecord) {
  await kv.set(keys.user(u), JSON.stringify(user));
}

async function emailOwners(kv: KV, email: string): Promise<string[]> {
  try {
    const list = JSON.parse((await kv.get(keys.email(email))) ?? "[]") as unknown;
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

async function linkEmail(kv: KV, email: string, u: string) {
  const owners = await emailOwners(kv, email);
  if (!owners.includes(u)) await kv.set(keys.email(email), JSON.stringify([...owners, u].slice(-20)));
}

async function unlinkEmail(kv: KV, email: string | undefined, u: string) {
  if (!email) return;
  const owners = (await emailOwners(kv, email)).filter((x) => x !== u);
  if (owners.length) await kv.set(keys.email(email), JSON.stringify(owners));
  else await kv.del(keys.email(email));
}

/**
 * Comprueba la contraseña de una cuenta contando los fallos, igual que al
 * entrar: así una sesión robada no sirve para adivinar la contraseña.
 */
async function checkPassword(kv: KV, u: string, user: UserRecord, password: unknown, ip: string): Promise<AccountError | null> {
  const [failsIp, failsTotal] = await Promise.all([kv.get(keys.failsIp(u, ip)), kv.get(keys.failsTotal(u))]);
  if (Number(failsIp ?? 0) >= LIMITS.failsPerIp.max || Number(failsTotal ?? 0) >= LIMITS.failsTotal.max) return "locked";
  if (typeof password === "string" && password.length <= 128 && (await verifyPassword(password, user.hash))) return null;
  await kv.incr(keys.failsIp(u, ip), LIMITS.failsPerIp.windowSec);
  await kv.incr(keys.failsTotal(u), LIMITS.failsTotal.windowSec);
  return "bad_credentials";
}

/* ---------- Registro, ingreso y sesión ---------- */

export async function register(
  kv: KV,
  name: unknown,
  emailRaw: unknown,
  password: unknown,
  ip: string,
): Promise<Result<{ u: string; user: UserRecord }>> {
  const u = normalizeUsername(name);
  if (!u) return { ok: false, error: "invalid_username" };
  if (RESERVED.test(u.replace(/[._-]/g, ""))) return { ok: false, error: "reserved_username" };
  const email = normalizeEmail(emailRaw);
  if (!email) return { ok: false, error: "invalid_email" };
  if (typeof password !== "string") return { ok: false, error: "short" };
  const problem = passwordProblem(password, u);
  if (problem) return { ok: false, error: problem };
  if ((await kv.incr(keys.ipSignups(ip), LIMITS.ipSignups.windowSec)) > LIMITS.ipSignups.max) return { ok: false, error: "rate_limited" };
  const now = Date.now();
  const user: UserRecord = { name: String(name).trim(), hash: await hashPassword(password), createdAt: now, ver: 1, email, emailVerified: false };
  // NX: si dos personas eligen el mismo nombre a la vez, gana una sola.
  if (!(await kv.set(keys.user(u), JSON.stringify(user), { nx: true }))) return { ok: false, error: "taken" };
  await Promise.all([linkEmail(kv, email, u), kv.zadd(keys.users(), now, u)]);
  return { ok: true, value: { u, user } };
}

export async function login(kv: KV, name: unknown, password: unknown, ip: string): Promise<Result<{ u: string; user: UserRecord }>> {
  if ((await kv.incr(keys.ipAttempts(ip), LIMITS.ipAttempts.windowSec)) > LIMITS.ipAttempts.max) return { ok: false, error: "rate_limited" };
  const u = normalizeUsername(name);
  if (!u || typeof password !== "string" || password.length > 128) {
    await verifyPassword("x", await dummyHash());
    return { ok: false, error: "bad_credentials" };
  }
  const user = await readUser(kv, u);
  if (!user) {
    // Mismo tiempo de respuesta que con una cuenta real.
    await verifyPassword(password, await dummyHash());
    return { ok: false, error: "bad_credentials" };
  }
  const wrong = await checkPassword(kv, u, user, password, ip);
  if (wrong) return { ok: false, error: wrong };
  // El bloqueo solo se revela con la contraseña correcta.
  if (user.banned) return { ok: false, error: "banned" };
  await kv.del(keys.failsIp(u, ip));
  const updated: UserRecord = { ...user, lastLoginAt: Date.now() };
  await writeUser(kv, u, updated);
  return { ok: true, value: { u, user: updated } };
}

/** La cuenta de una sesión, si sigue existiendo, no está bloqueada y la sesión no quedó vieja. */
export async function sessionUser(kv: KV, u: string, ver: number): Promise<UserRecord | null> {
  const user = await readUser(kv, u);
  return user && user.ver === ver && !user.banned ? user : null;
}

/* ---------- Lista de alertas ---------- */

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

/* ---------- Email: confirmar, cambiar y recuperar la cuenta ---------- */

function parseTokenData(raw: string | null): { u: string; email: string } | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as { u?: unknown; email?: unknown };
    return typeof d.u === "string" && typeof d.email === "string" ? { u: d.u, email: d.email } : null;
  } catch {
    return null;
  }
}

/** Enlace para confirmar el email (vence en 24 h). null si se pidieron demasiados. */
export async function createVerifyToken(kv: KV, u: string, email: string): Promise<string | null> {
  if ((await kv.incr(keys.verifyMails(u), LIMITS.verifyMails.windowSec)) > LIMITS.verifyMails.max) return null;
  // Para que nadie use el registro para llenarle la casilla a otra persona.
  if ((await kv.incr(keys.verifyMailsTo(email), LIMITS.verifyMailsTo.windowSec)) > LIMITS.verifyMailsTo.max) return null;
  const token = randomBytes(32).toString("base64url");
  await kv.set(keys.verifyToken(token), JSON.stringify({ u, email }), { exSeconds: TOKEN_TTL.verify });
  return token;
}

export async function confirmEmail(kv: KV, token: unknown): Promise<Result<{ u: string; user: UserRecord }>> {
  if (typeof token !== "string" || token.length > 100) return { ok: false, error: "invalid_token" };
  const link = parseTokenData(await kv.getdel(keys.verifyToken(token)));
  if (!link) return { ok: false, error: "invalid_token" };
  const { u, email } = link;
  const user = await readUser(kv, u);
  // Si después de pedir el enlace cambió el email, el enlace viejo ya no sirve.
  if (!user || user.email !== email) return { ok: false, error: "invalid_token" };
  const updated = { ...user, emailVerified: true };
  await writeUser(kv, u, updated);
  return { ok: true, value: { u, user: updated } };
}

export async function changeEmail(kv: KV, u: string, password: unknown, emailRaw: unknown, ip = "-"): Promise<Result<UserRecord>> {
  const user = await readUser(kv, u);
  if (!user) return { ok: false, error: "bad_credentials" };
  const wrong = await checkPassword(kv, u, user, password, ip);
  if (wrong) return { ok: false, error: wrong };
  const email = normalizeEmail(emailRaw);
  if (!email) return { ok: false, error: "invalid_email" };
  await unlinkEmail(kv, user.email, u);
  const updated: UserRecord = { ...user, email, emailVerified: false };
  await writeUser(kv, u, updated);
  await linkEmail(kv, email, u);
  return { ok: true, value: updated };
}

/**
 * Pedido de "olvidé mi usuario o contraseña": para cada cuenta con ese email
 * confirmado, un enlace de un solo uso que vence en 1 hora. Nunca dice si el
 * email existe (la respuesta es siempre la misma).
 */
export async function requestRecovery(
  kv: KV,
  emailRaw: unknown,
  ip: string,
): Promise<Result<{ email: string; accounts: { name: string; token: string }[] }>> {
  if ((await kv.incr(keys.ipRecovery(ip), LIMITS.ipRecovery.windowSec)) > LIMITS.ipRecovery.max) return { ok: false, error: "rate_limited" };
  const email = normalizeEmail(emailRaw);
  if (!email) return { ok: false, error: "invalid_email" };
  if ((await kv.incr(keys.emailRecovery(email), LIMITS.emailRecovery.windowSec)) > LIMITS.emailRecovery.max) {
    return { ok: true, value: { email, accounts: [] } };
  }
  const accounts: { name: string; token: string }[] = [];
  for (const u of await emailOwners(kv, email)) {
    const user = await readUser(kv, u);
    if (!user || user.email !== email || !user.emailVerified || user.banned) continue;
    const token = randomBytes(32).toString("base64url");
    await kv.set(keys.resetToken(token), JSON.stringify({ u, email }), { exSeconds: TOKEN_TTL.reset });
    accounts.push({ name: user.name, token });
  }
  return { ok: true, value: { email, accounts } };
}

export async function resetPassword(kv: KV, token: unknown, password: unknown): Promise<Result<{ u: string; user: UserRecord }>> {
  if (typeof token !== "string" || token.length > 100) return { ok: false, error: "invalid_token" };
  const raw = await kv.get(keys.resetToken(token));
  const link = parseTokenData(raw);
  if (!link) return { ok: false, error: "invalid_token" };
  const { u, email } = link;
  const user = await readUser(kv, u);
  // Si cambió el email después de pedir el enlace, el enlace viejo ya no sirve.
  if (!user || user.banned || user.email !== email) return { ok: false, error: "invalid_token" };
  if (typeof password !== "string") return { ok: false, error: "short" };
  const problem = passwordProblem(password, u);
  if (problem) return { ok: false, error: problem };
  // Un solo uso: si otro pedido lo usó al mismo tiempo, este no sirve.
  if ((await kv.getdel(keys.resetToken(token))) !== raw) return { ok: false, error: "invalid_token" };
  // Nueva contraseña, email confirmado (el enlace llegó ahí) y cierre de las demás sesiones.
  const updated: UserRecord = { ...user, hash: await hashPassword(password), ver: user.ver + 1, emailVerified: true };
  await writeUser(kv, u, updated);
  await kv.del(keys.failsTotal(u));
  return { ok: true, value: { u, user: updated } };
}

/* ---------- Contraseña y borrado ---------- */

export async function changePassword(kv: KV, u: string, current: unknown, next: unknown, ip = "-"): Promise<Result<UserRecord>> {
  const user = await readUser(kv, u);
  if (!user) return { ok: false, error: "bad_credentials" };
  const wrong = await checkPassword(kv, u, user, current, ip);
  if (wrong) return { ok: false, error: wrong };
  if (typeof next !== "string") return { ok: false, error: "short" };
  const problem = passwordProblem(next, u);
  if (problem) return { ok: false, error: problem };
  // Subir la versión cierra las sesiones abiertas en otros dispositivos.
  const updated: UserRecord = { ...user, hash: await hashPassword(next), ver: user.ver + 1 };
  await writeUser(kv, u, updated);
  return { ok: true, value: updated };
}

async function removeUser(kv: KV, u: string, user: UserRecord | null) {
  const fails = await kv.keys(`fails:${u}:`, 200);
  await Promise.all([
    kv.del(keys.user(u), keys.rules(u), keys.failsTotal(u), keys.verifyMails(u), ...fails),
    kv.zrem(keys.users(), u),
    unlinkEmail(kv, user?.email, u),
  ]);
}

export async function deleteAccount(kv: KV, u: string, password: unknown, ip = "-"): Promise<Result<true>> {
  const user = await readUser(kv, u);
  if (!user) return { ok: false, error: "bad_credentials" };
  const wrong = await checkPassword(kv, u, user, password, ip);
  if (wrong) return { ok: false, error: wrong };
  await removeUser(kv, u, user);
  return { ok: true, value: true };
}

/* ---------- Administración ---------- */

/** Cuentas de administración: las de ADMIN_USERS (separadas por coma). */
export function isAdmin(u: string, env: Record<string, string | undefined> = process.env): boolean {
  return (env.ADMIN_USERS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(u);
}

export interface AdminUserRow {
  u: string;
  name: string;
  createdAt: number;
  lastLoginAt: number | null;
  email: string;
  emailVerified: boolean;
  banned: boolean;
  rules: number;
  plan: Plan;
}

async function adminRow(kv: KV, u: string): Promise<AdminUserRow | null> {
  const user = await readUser(kv, u);
  if (!user) return null;
  return {
    u,
    name: user.name,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt ?? null,
    email: maskEmail(user.email),
    emailVerified: !!user.emailVerified,
    banned: !!user.banned,
    rules: (await getRules(kv, u)).length,
    plan: planOf(user),
  };
}

export async function adminListUsers(kv: KV, offset: number, limit: number): Promise<{ total: number; rows: AdminUserRow[] }> {
  const [total, list] = await Promise.all([kv.zcard(keys.users()), kv.zrevrange(keys.users(), offset, offset + limit - 1)]);
  const rows = (await Promise.all(list.map((u) => adminRow(kv, u)))).filter((r): r is AdminUserRow => r !== null);
  return { total, rows };
}

/** Busca por usuario exacto o por email completo. */
export async function adminFindUsers(kv: KV, query: string): Promise<AdminUserRow[]> {
  const email = normalizeEmail(query);
  const candidates = email ? await emailOwners(kv, email) : [normalizeUsername(query)].filter((x): x is string => !!x);
  return (await Promise.all(candidates.map((u) => adminRow(kv, u)))).filter((r): r is AdminUserRow => r !== null);
}

export async function adminSetBanned(kv: KV, u: string, banned: boolean): Promise<boolean> {
  const user = await readUser(kv, u);
  if (!user) return false;
  // Bloquear también cierra todas sus sesiones.
  await writeUser(kv, u, { ...user, banned, ver: banned ? user.ver + 1 : user.ver });
  return true;
}

/** Cambia el plan de una cuenta (Standard o VIP). */
export async function adminSetPlan(kv: KV, u: string, plan: Plan): Promise<boolean> {
  const user = await readUser(kv, u);
  if (!user) return false;
  const next: UserRecord = { ...user };
  if (plan === "vip") next.plan = "vip";
  else delete next.plan;
  await writeUser(kv, u, next);
  return true;
}

export async function adminUnlock(kv: KV, u: string): Promise<void> {
  const fails = await kv.keys(`fails:${u}:`, 200);
  await kv.del(keys.failsTotal(u), ...fails);
}

export async function adminDeleteUser(kv: KV, u: string): Promise<boolean> {
  const user = await readUser(kv, u);
  if (!user) return false;
  await removeUser(kv, u, user);
  return true;
}

/** Reconstruye la lista de cuentas y el índice de emails (por ejemplo, para cuentas creadas antes del panel). */
export async function adminRebuildIndex(kv: KV): Promise<number> {
  const userKeys = await kv.keys("user:", 10_000);
  for (const key of userKeys) {
    const u = key.slice("user:".length);
    const user = await readUser(kv, u);
    if (!user) continue;
    await kv.zadd(keys.users(), user.createdAt || Date.now(), u);
    if (user.email) await linkEmail(kv, user.email, u);
  }
  return userKeys.length;
}

export interface AdminLogEntry {
  at: number;
  admin: string;
  action: string;
  target?: string;
}

export async function adminLog(kv: KV, entry: AdminLogEntry) {
  await kv.lpush(keys.adminLog(), JSON.stringify(entry), 200);
}

export async function adminReadLog(kv: KV, limit = 50): Promise<AdminLogEntry[]> {
  return (await kv.lrange(keys.adminLog(), 0, limit - 1)).flatMap((s) => {
    try {
      return [JSON.parse(s) as AdminLogEntry];
    } catch {
      return [];
    }
  });
}
