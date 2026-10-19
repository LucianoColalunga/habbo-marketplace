import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Sesión en una cookie firmada (HMAC-SHA256): dice qué cuenta es y vence a los
 * 30 días. No se puede falsificar sin la clave del servidor. `v` es la versión
 * de la cuenta: al cambiar la contraseña sube y se cierran las demás sesiones.
 */
export const SESSION_COOKIE = "bm_session";
export const SESSION_DAYS = 30;

export interface Session {
  /** Usuario en minúsculas (la clave de la cuenta). */
  u: string;
  v: number;
  exp: number;
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function createSession(u: string, v: number, key: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ u, v, exp: now + SESSION_DAYS * 86_400_000 } satisfies Session)).toString("base64url");
  return `${payload}.${sign(payload, key)}`;
}

export function readSession(token: string | undefined | null, key: string, now = Date.now()): Session | null {
  if (!token || token.length > 512) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload, key));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<Session>;
    if (typeof s.u !== "string" || typeof s.v !== "number" || typeof s.exp !== "number" || s.exp < now) return null;
    return { u: s.u, v: s.v, exp: s.exp };
  } catch {
    return null;
  }
}

/** Lee una cookie del encabezado Cookie. */
export function cookieValue(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

export function sessionCookie(value: string, secure: boolean): string {
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86_400}${secure ? "; Secure" : ""}`;
}

export function clearSessionCookie(secure: boolean): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}
