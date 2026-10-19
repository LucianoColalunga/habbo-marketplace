import { accountsEnabled, getKV, sessionKeyMaterial, type KV } from "@/lib/accounts/kv";
import { changePassword, deleteAccount, getRules, login, register, saveRules, sessionUser } from "@/lib/accounts/service";
import { clearSessionCookie, cookieValue, createSession, readSession, SESSION_COOKIE, sessionCookie } from "@/lib/accounts/session";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";

/**
 * API de cuentas:
 *   GET  /api/account/me        → quién está conectado y su lista de alertas
 *   POST /api/account/register  → { username, password }
 *   POST /api/account/login     → { username, password }
 *   POST /api/account/logout
 *   PUT  /api/account/rules     → { rules }
 *   POST /api/account/password  → { current, next }
 *   POST /api/account/delete    → { password }
 */

const NO_STORE = { "Cache-Control": "no-store" };

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

function isSecure(request: Request): boolean {
  return new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
}

/** Solo pedidos que vienen de páginas de este mismo sitio (protección contra CSRF). */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin) return origin === new URL(request.url).origin;
  return request.headers.get("sec-fetch-site") === "same-origin";
}

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
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

async function current(request: Request, kv: KV, key: string) {
  const session = readSession(cookieValue(request.headers.get("cookie"), SESSION_COOKIE), key);
  if (!session) return null;
  const user = await sessionUser(kv, session.u, session.v);
  return user ? { u: session.u, user } : null;
}

function context() {
  const kv = getKV();
  const key = sessionKeyMaterial();
  return accountsEnabled() && kv && key ? { kv, key } : null;
}

export async function GET(request: Request, { params }: RouteContext<"/api/account/[action]">) {
  const { action } = await params;
  if (action !== "me") return json({ error: "not_found" }, 404);
  const ctx = context();
  if (!ctx) return json({ enabled: false, user: null });
  try {
    const me = await current(request, ctx.kv, ctx.key);
    if (!me) {
      // Una cookie vieja o inválida se borra.
      const stale = cookieValue(request.headers.get("cookie"), SESSION_COOKIE);
      return json({ enabled: true, user: null }, 200, stale ? { "Set-Cookie": clearSessionCookie(isSecure(request)) } : {});
    }
    return json({ enabled: true, user: { name: me.user.name }, rules: await getRules(ctx.kv, me.u) });
  } catch {
    return json({ enabled: true, user: null, error: "server" }, 503);
  }
}

async function write(request: Request, action: string) {
  const ctx = context();
  if (!ctx) return json({ error: "disabled" }, 404);
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  // Freno extra por instancia, además de los límites guardados en la base.
  const limited = rateLimit(`account:${clientIp(request)}`, 40, 60_000);
  if (!limited.ok) return json({ error: "rate_limited" }, 429, { "Retry-After": String(limited.retryAfter) });
  const body = await readBody(request);
  if (!body) return json({ error: "bad_request" }, 400);
  const { kv, key } = ctx;
  const secure = isSecure(request);
  const ip = clientIp(request);

  try {
    if (action === "register" || action === "login") {
      const result = action === "register" ? await register(kv, body.username, body.password, ip) : await login(kv, body.username, body.password, ip);
      if (!result.ok) return json({ error: result.error }, result.error === "rate_limited" || result.error === "locked" ? 429 : 400);
      const { u, user } = result.value;
      return json({ user: { name: user.name }, rules: await getRules(kv, u) }, 200, {
        "Set-Cookie": sessionCookie(createSession(u, user.ver, key), secure),
      });
    }

    if (action === "logout") return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie(secure) });

    const me = await current(request, kv, key);
    if (!me) return json({ error: "unauthorized" }, 401, { "Set-Cookie": clearSessionCookie(secure) });

    if (action === "rules") {
      const result = await saveRules(kv, me.u, body.rules);
      return result.ok ? json({ ok: true, count: result.value.length }) : json({ error: result.error }, 400);
    }
    if (action === "password") {
      const result = await changePassword(kv, me.u, body.current, body.next);
      if (!result.ok) return json({ error: result.error }, 400);
      return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(createSession(me.u, result.value.ver, key), secure) });
    }
    if (action === "delete") {
      const result = await deleteAccount(kv, me.u, body.password);
      if (!result.ok) return json({ error: result.error }, 400);
      return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie(secure) });
    }
    return json({ error: "not_found" }, 404);
  } catch {
    return json({ error: "server" }, 503);
  }
}

export async function POST(request: Request, { params }: RouteContext<"/api/account/[action]">) {
  const { action } = await params;
  if (action === "rules") return json({ error: "not_found" }, 404);
  return write(request, action);
}

export async function PUT(request: Request, { params }: RouteContext<"/api/account/[action]">) {
  const { action } = await params;
  if (action !== "rules") return json({ error: "not_found" }, 404);
  return write(request, action);
}
