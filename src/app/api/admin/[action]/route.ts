import { revalidateTag } from "next/cache";
import { accountContext, canAdmin, currentAccount, json, readBody, sameOrigin, type AccountContext } from "@/lib/accounts/http";
import { mailMode } from "@/lib/accounts/mailer";
import {
  adminDeleteUser,
  adminFindUsers,
  adminListUsers,
  adminLog,
  adminReadLog,
  adminRebuildIndex,
  adminSetBanned,
  adminSetPlan,
  adminUnlock,
  normalizeUsername,
} from "@/lib/accounts/service";
import { sendTestMessage } from "@/lib/alerts/server";
import { configuredChannels } from "@/lib/alerts/notifiers";
import { forgetHotel } from "@/lib/data/store";
import { getMarketMeta } from "@/lib/data/views";
import { enabledHotels } from "@/lib/hotels";
import { getNftMeta } from "@/lib/nft/views";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { siteUrl } from "@/lib/site";

/**
 * API del panel de administración. Solo para las cuentas de ADMIN_USERS: a
 * cualquier otra persona le responde "no existe". Cada pedido vuelve a
 * comprobar la sesión y queda anotado en el registro de acciones.
 *   GET  /api/admin/status            → estado del sitio y configuración (sin secretos)
 *   GET  /api/admin/users?offset=&q=  → cuentas (emails ocultos en parte)
 *   GET  /api/admin/log               → últimas acciones de administración
 *   POST /api/admin/ban      { u, banned }
 *   POST /api/admin/unlock   { u }
 *   POST /api/admin/delete   { u, confirm }  (confirm tiene que repetir el usuario)
 *   POST /api/admin/plan     { u, plan: "vip" | "standard" }
 *   POST /api/admin/rebuild
 *   POST /api/admin/revalidate
 *   POST /api/admin/test-channels
 */

const PAGE = 25;
const hidden = () => json({ error: "not_found" }, 404);

async function admin(request: Request): Promise<{ ctx: AccountContext; u: string } | null> {
  const limited = rateLimit(`admin:${clientIp(request)}`, 60, 60_000);
  if (!limited.ok) return null;
  const ctx = accountContext();
  if (!ctx) return null;
  const me = await currentAccount(request, ctx);
  return me && canAdmin(me.u, me.user) ? { ctx, u: me.u } : null;
}

async function status(ctx: AccountContext) {
  const hotels = await Promise.all(
    enabledHotels().map(async (hotel) => {
      const meta = await getMarketMeta(hotel).catch(() => null);
      return {
        hotel,
        generatedAt: meta?.generatedAt ?? null,
        statsDate: meta?.statsDate ?? null,
        catalogSize: meta?.catalogSize ?? 0,
        scanned: meta?.scan?.scanned ?? null,
        selected: meta?.scan?.selected ?? null,
        rateLimited: meta?.scan?.rateLimited ?? 0,
        truncated: meta?.scan?.truncated ?? false,
        errors: meta?.scan?.errors.length ?? 0,
      };
    }),
  );
  const nft = await getNftMeta().catch(() => null);
  let channels: string[] = [];
  try {
    channels = configuredChannels().map((c) => c.name);
  } catch {
    channels = [];
  }
  const env = process.env;
  return {
    hotels,
    nft: { generatedAt: nft?.generatedAt ?? null },
    config: {
      // Solo si cada cosa está configurada; nunca los valores.
      store: ctx.kv.kind,
      mail: mailMode(),
      channels,
      sessionSecret: Boolean(env.SESSION_SECRET && env.SESSION_SECRET.length >= 32),
      cronSecret: Boolean(env.CRON_SECRET),
      siteUrl: siteUrl() || null,
      admins: (env.ADMIN_USERS ?? "").split(",").filter((s) => s.trim()).length,
    },
    users: await ctx.kv.zcard("users"),
  };
}

export async function GET(request: Request, { params }: RouteContext<"/api/admin/[action]">) {
  const { action } = await params;
  const me = await admin(request).catch(() => null);
  if (!me) return hidden();
  const { kv } = me.ctx;
  try {
    switch (action) {
      case "status":
        return json(await status(me.ctx));
      case "users": {
        const url = new URL(request.url);
        const q = (url.searchParams.get("q") ?? "").trim().slice(0, 254);
        if (q) {
          const rows = await adminFindUsers(kv, q);
          return json({ total: rows.length, offset: 0, rows });
        }
        const offset = Math.max(0, Math.min(100_000, Number(url.searchParams.get("offset")) || 0));
        return json({ offset, ...(await adminListUsers(kv, offset, PAGE)) });
      }
      case "log":
        return json({ entries: await adminReadLog(kv, 50) });
    }
    return hidden();
  } catch {
    return json({ error: "server" }, 503);
  }
}

export async function POST(request: Request, { params }: RouteContext<"/api/admin/[action]">) {
  const { action } = await params;
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  const me = await admin(request).catch(() => null);
  if (!me) return hidden();
  const body = await readBody(request);
  if (!body) return json({ error: "bad_request" }, 400);
  const { kv } = me.ctx;
  const target = normalizeUsername(body.u);
  const log = (what: string, t?: string) => adminLog(kv, { at: Date.now(), admin: me.u, action: what, ...(t ? { target: t } : {}) });

  try {
    switch (action) {
      case "ban":
      case "unlock":
      case "delete": {
        if (!target) return json({ error: "bad_request" }, 400);
        // Nadie se bloquea ni se borra a sí mismo desde el panel (para no quedarse afuera).
        if (target === me.u && action !== "unlock") return json({ error: "self" }, 400);
        if (action === "ban") {
          const banned = body.banned === true;
          if (!(await adminSetBanned(kv, target, banned))) return json({ error: "not_found_user" }, 404);
          await log(banned ? "ban" : "unban", target);
        } else if (action === "unlock") {
          await adminUnlock(kv, target);
          await log("unlock", target);
        } else {
          if (normalizeUsername(body.confirm) !== target) return json({ error: "confirm" }, 400);
          if (!(await adminDeleteUser(kv, target))) return json({ error: "not_found_user" }, 404);
          await log("delete", target);
        }
        return json({ ok: true });
      }
      case "plan": {
        if (!target) return json({ error: "bad_request" }, 400);
        const plan = body.plan === "vip" ? "vip" : "standard";
        if (!(await adminSetPlan(kv, target, plan))) return json({ error: "not_found_user" }, 404);
        await log(plan === "vip" ? "vip-on" : "vip-off", target);
        return json({ ok: true });
      }
      case "rebuild": {
        const count = await adminRebuildIndex(kv);
        await log("rebuild");
        return json({ ok: true, count });
      }
      case "revalidate": {
        for (const hotel of enabledHotels()) {
          forgetHotel(hotel);
          revalidateTag(`market:${hotel}`, "max");
        }
        revalidateTag("nft", "max");
        await log("revalidate");
        return json({ ok: true });
      }
      case "test-channels": {
        // Pocos por rato, para no llenar el canal de mensajes de prueba.
        if (!rateLimit(`admin-test:${me.u}`, 3, 10 * 60_000).ok) return json({ error: "rate_limited" }, 429);
        const result = await sendTestMessage();
        await log("test-channels");
        return json({ ok: result.errors.length === 0, channels: result.channels, errors: result.errors.length });
      }
    }
    return hidden();
  } catch {
    return json({ error: "server" }, 503);
  }
}
