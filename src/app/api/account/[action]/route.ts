import { after } from "next/server";
import { resetEmail, verifyEmail } from "@/lib/accounts/emails";
import { accountContext, canAdmin, currentAccount, isSecure, json, readBody, sameOrigin } from "@/lib/accounts/http";
import { mailEnabled, sendMail } from "@/lib/accounts/mailer";
import {
  changeEmail,
  changePassword,
  confirmEmail,
  createVerifyToken,
  deleteAccount,
  getRules,
  login,
  planOf,
  register,
  requestRecovery,
  resetPassword,
  saveRules,
  type UserRecord,
} from "@/lib/accounts/service";
import { clearSessionCookie, cookieValue, createSession, SESSION_COOKIE, sessionCookie } from "@/lib/accounts/session";
import { homeHotel, isLang, localePath, type Lang } from "@/lib/i18n/config";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { siteUrl } from "@/lib/site";

/**
 * API de cuentas:
 *   GET  /api/account/config     → si hay cuentas y correos (igual para todos: la guarda el CDN)
 *   GET  /api/account/me         → quién está conectado y su lista de alertas
 *   POST /api/account/register   → { username, email, password, lang }
 *   POST /api/account/login      → { username, password }
 *   POST /api/account/logout
 *   PUT  /api/account/rules      → { rules }
 *   POST /api/account/password   → { current, next }
 *   POST /api/account/email      → { password, email, lang }   (cambiar o agregar email)
 *   POST /api/account/resend     → { lang }                    (reenviar la confirmación)
 *   POST /api/account/verify     → { token }                   (confirmar el email)
 *   POST /api/account/forgot     → { email, lang }             (olvidé mi usuario o contraseña)
 *   POST /api/account/reset      → { token, password }         (contraseña nueva)
 *   POST /api/account/delete     → { password }
 */

function langOf(body: Record<string, unknown>): Lang {
  return isLang(body.lang) ? body.lang : "es";
}

/** Enlace absoluto con la dirección oficial del sitio (nunca la que mande el navegador). */
function link(lang: Lang, page: "verificar" | "restablecer", token: string): string {
  return `${siteUrl()}${localePath(lang, `/${homeHotel(lang)}/cuenta/${page}`)}?token=${encodeURIComponent(token)}`;
}

async function sendVerification(kv: Parameters<typeof createVerifyToken>[0], u: string, user: UserRecord, lang: Lang): Promise<boolean> {
  if (!mailEnabled() || !user.email) return false;
  const token = await createVerifyToken(kv, u, user.email);
  if (!token) return false;
  try {
    await sendMail(verifyEmail(lang, user.email, user.name, link(lang, "verificar", token)));
    return true;
  } catch {
    return false;
  }
}

function publicUser(u: string, user: UserRecord) {
  return { name: user.name, email: user.email ?? null, emailVerified: !!user.emailVerified, admin: canAdmin(u, user), plan: planOf(user) };
}

export async function GET(request: Request, { params }: RouteContext<"/api/account/[action]">) {
  const { action } = await params;
  if (action === "config") {
    // Sin datos personales: la consulta de quien no entró nunca toca la base y la sirve el CDN.
    return Response.json(
      { enabled: accountContext() !== null, mail: mailEnabled() },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  }
  if (action !== "me") return json({ error: "not_found" }, 404);
  const ctx = accountContext();
  if (!ctx) return json({ enabled: false, user: null });
  try {
    const me = await currentAccount(request, ctx);
    if (!me) {
      // Una cookie vieja o inválida se borra.
      const stale = cookieValue(request.headers.get("cookie"), SESSION_COOKIE);
      return json({ enabled: true, mail: mailEnabled(), user: null }, 200, stale ? { "Set-Cookie": clearSessionCookie(isSecure(request)) } : {});
    }
    return json({ enabled: true, mail: mailEnabled(), user: publicUser(me.u, me.user), rules: await getRules(ctx.kv, me.u) });
  } catch {
    return json({ enabled: true, user: null, error: "server" }, 503);
  }
}

async function write(request: Request, action: string) {
  const ctx = accountContext();
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
  const lang = langOf(body);
  const fail = (error: string) => json({ error }, error === "rate_limited" || error === "locked" ? 429 : 400);
  const signedIn = async (u: string, user: UserRecord, extra: Record<string, unknown> = {}) =>
    json({ user: publicUser(u, user), rules: await getRules(kv, u), ...extra }, 200, {
      "Set-Cookie": sessionCookie(createSession(u, user.ver, key), secure),
    });

  try {
    switch (action) {
      case "register": {
        const result = await register(kv, body.username, body.email, body.password, ip);
        if (!result.ok) return fail(result.error);
        const sent = await sendVerification(kv, result.value.u, result.value.user, lang);
        return signedIn(result.value.u, result.value.user, { verificationSent: sent });
      }
      case "login": {
        const result = await login(kv, body.username, body.password, ip);
        return result.ok ? signedIn(result.value.u, result.value.user) : fail(result.error);
      }
      case "logout":
        return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie(secure) });
      case "verify": {
        const result = await confirmEmail(kv, body.token);
        return result.ok ? json({ ok: true }) : fail(result.error);
      }
      case "forgot": {
        if (!mailEnabled()) return json({ error: "mail_disabled" }, 503);
        const result = await requestRecovery(kv, body.email, ip);
        if (!result.ok) return fail(result.error);
        const { email, accounts } = result.value;
        // El correo sale después de responder: así la respuesta tarda lo mismo
        // tenga o no cuenta el email, y es siempre la misma.
        if (accounts.length) {
          const mail = resetEmail(lang, email, accounts.map((a) => ({ name: a.name, link: link(lang, "restablecer", a.token) })));
          after(() => sendMail(mail).catch(() => undefined));
        }
        return json({ ok: true });
      }
      case "reset": {
        const result = await resetPassword(kv, body.token, body.password);
        return result.ok ? signedIn(result.value.u, result.value.user) : fail(result.error);
      }
    }

    const me = await currentAccount(request, ctx);
    if (!me) return json({ error: "unauthorized" }, 401, { "Set-Cookie": clearSessionCookie(secure) });

    switch (action) {
      case "rules": {
        const result = await saveRules(kv, me.u, body.rules);
        return result.ok ? json({ ok: true, count: result.value.length }) : fail(result.error);
      }
      case "password": {
        const result = await changePassword(kv, me.u, body.current, body.next, ip);
        if (!result.ok) return fail(result.error);
        return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(createSession(me.u, result.value.ver, key), secure) });
      }
      case "email": {
        const result = await changeEmail(kv, me.u, body.password, body.email, ip);
        if (!result.ok) return fail(result.error);
        const sent = await sendVerification(kv, me.u, result.value, lang);
        return json({ ok: true, user: publicUser(me.u, result.value), verificationSent: sent });
      }
      case "resend": {
        if (me.user.emailVerified) return json({ ok: true, verificationSent: false });
        const sent = await sendVerification(kv, me.u, me.user, lang);
        return sent ? json({ ok: true, verificationSent: true }) : json({ error: mailEnabled() ? "rate_limited" : "mail_disabled" }, 429);
      }
      case "delete": {
        const result = await deleteAccount(kv, me.u, body.password, ip);
        if (!result.ok) return fail(result.error);
        return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie(secure) });
      }
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
