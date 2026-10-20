import { accountsEnabled, getKV, sessionKeyMaterial, type KV } from "./kv";
import { mailMode } from "./mailer";
import { isAdmin, sessionUser, type UserRecord } from "./service";
import { cookieValue, readSession, SESSION_COOKIE } from "./session";

/** Piezas comunes de las rutas de cuentas y de administración. */

const NO_STORE = { "Cache-Control": "no-store" };

export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

export function isSecure(request: Request): boolean {
  return new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
}

/** Solo pedidos que vienen de páginas de este mismo sitio (protección contra CSRF). */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin) return origin === new URL(request.url).origin;
  return request.headers.get("sec-fetch-site") === "same-origin";
}

export async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  if (!request.headers.get("content-type")?.includes("application/json")) return null;
  const text = await request.text();
  if (text.length > 64_000) return null;
  try {
    const body = JSON.parse(text) as unknown;
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export interface AccountContext {
  kv: KV;
  key: string;
}

export function accountContext(): AccountContext | null {
  const kv = getKV();
  const key = sessionKeyMaterial();
  return accountsEnabled() && kv && key ? { kv, key } : null;
}

/**
 * Puede usar el panel de administración: su usuario está en ADMIN_USERS y,
 * si el sitio ya manda correos, confirmó su email (así no alcanza con haber
 * registrado ese nombre antes que el dueño).
 */
export function canAdmin(u: string, user: UserRecord, env: Record<string, string | undefined> = process.env): boolean {
  return isAdmin(u, env) && (mailMode(env) !== "smtp" || user.emailVerified === true);
}

/** La cuenta conectada (por la cookie de sesión), si es válida. */
export async function currentAccount(request: Request, ctx: AccountContext): Promise<{ u: string; user: UserRecord } | null> {
  const session = readSession(cookieValue(request.headers.get("cookie"), SESSION_COOKIE), ctx.key);
  if (!session) return null;
  const user = await sessionUser(ctx.kv, session.u, session.v);
  return user ? { u: session.u, user } : null;
}
