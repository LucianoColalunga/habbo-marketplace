"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useAccount } from "@/lib/accounts/client";
import { useI18n } from "@/lib/i18n/client";
import { useNow } from "@/lib/use-now";
import { Notice } from "@/components/ui";

/** Panel de administración: estado del sitio, configuración, acciones, cuentas y registro. */

interface HotelStatus {
  hotel: string;
  generatedAt: string | null;
  statsDate: string | null;
  catalogSize: number;
  scanned: number | null;
  selected: number | null;
  rateLimited: number;
  truncated: boolean;
  errors: number;
}
interface SiteStatus {
  hotels: HotelStatus[];
  nft: { generatedAt: string | null };
  config: {
    store: "upstash" | "file";
    mail: "smtp" | "outbox" | "off";
    channels: string[];
    sessionSecret: boolean;
    cronSecret: boolean;
    siteUrl: string | null;
    admins: number;
  };
  users: number;
}
interface UserRow {
  u: string;
  name: string;
  createdAt: number;
  lastLoginAt: number | null;
  email: string;
  emailVerified: boolean;
  banned: boolean;
  rules: number;
  plan: "standard" | "vip";
}
interface LogEntry {
  at: number;
  admin: string;
  action: string;
  target?: string;
}
type Res = { ok: boolean; error?: string; data: Record<string, unknown> };

async function api(method: "GET" | "POST", path: string, body?: unknown): Promise<Res> {
  try {
    const res = await fetch(`/api/admin/${path}`, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      ...(method === "POST" ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) } : {}),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok && data.ok !== false, error: typeof data.error === "string" ? data.error : res.ok ? undefined : "server", data };
  } catch {
    return { ok: false, error: "server", data: {} };
  }
}

const fetchUsers = (offset: number, q: string) => api("GET", q ? `users?q=${encodeURIComponent(q)}` : `users?offset=${offset}`);

const btn = "rounded-lg border border-line px-3 py-1.5 text-sm text-text hover:bg-surface-2 disabled:opacity-60";
const input = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-text";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card space-y-3 p-4">
      <h2 className="font-display text-lg font-bold text-text">{title}</h2>
      {children}
    </section>
  );
}

export function AdminPanel() {
  const { t } = useI18n();
  const { status, admin, name } = useAccount();
  if (status === "loading") return <div className="skeleton h-64" aria-busy="true" />;
  if (status !== "user" || !admin || !name) return <Notice tone="warn">{t.admin.noAccess}</Notice>;
  return <AdminContent me={name.toLowerCase()} />;
}

function AdminContent({ me }: { me: string }) {
  const { t: ui, f } = useI18n();
  const t = ui.admin;
  const now = useNow();
  const [site, setSite] = useState<SiteStatus | null>(null);
  const [users, setUsers] = useState<{ total: number; rows: UserRow[]; offset: number; search: boolean } | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [query, setQuery] = useState("");

  const errorText = (code?: string) => t.errors[code ?? "server"] ?? t.errors.server;
  const when = (iso: string | null) => (iso && now ? f.relative(iso, now) : iso ? f.dateTime(iso) : "—");
  const ms = (v: number | null) => (v ? f.dayTime(v) : "—");

  const applyUsers = useCallback((res: Res, offset: number, q: string, append: boolean) => {
    if (!res.ok) return;
    const rows = (res.data.rows as UserRow[]) ?? [];
    setUsers((prev) => ({
      total: Number(res.data.total) || 0,
      offset,
      search: Boolean(q),
      rows: append && prev ? [...prev.rows, ...rows] : rows,
    }));
  }, []);

  const loadUsers = async (offset: number, q: string, append: boolean) => applyUsers(await fetchUsers(offset, q), offset, q, append);
  const loadLog = async () => {
    const res = await api("GET", "log");
    if (res.ok) setLog((res.data.entries as LogEntry[]) ?? []);
  };

  useEffect(() => {
    void Promise.all([api("GET", "status"), fetchUsers(0, ""), api("GET", "log")]).then(([s, u, l]) => {
      if (s.ok) setSite(s.data as unknown as SiteStatus);
      applyUsers(u, 0, "", false);
      if (l.ok) setLog((l.data.entries as LogEntry[]) ?? []);
      if (!s.ok || !u.ok) setLoadFailed(true);
    });
  }, [applyUsers]);

  /** Corre una acción, muestra el resultado y refresca la lista y el registro. */
  const act = async (path: string, body: unknown, done: (res: Res) => string) => {
    setBusy(true);
    setMessage(null);
    const res = await api("POST", path, body);
    setBusy(false);
    setMessage(res.ok ? { ok: true, text: done(res) } : { ok: false, text: errorText(res.error) });
    if (res.ok) {
      setConfirming(null);
      setConfirmText("");
      await Promise.all([users?.search ? loadUsers(0, query.trim(), false) : loadUsers(0, "", false), loadLog()]);
    }
  };

  if (loadFailed && !site) return <Notice tone="warn">{t.loadError}</Notice>;
  if (!site || !users) return <div className="skeleton h-64" aria-busy="true" />;
  const c = site.config;
  const yesNo = (v: boolean) => (v ? `✓ ${t.yes}` : `✕ ${t.no}`);

  return (
    <div className="space-y-6">
      {message && (
        <p className={`text-sm ${message.ok ? "text-up" : "text-down"}`} role={message.ok ? "status" : "alert"}>
          {message.text}
        </p>
      )}

      <Section title={t.statusTitle}>
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="text-text-2">
              <tr>
                <th className="py-1 pr-3 font-medium">{t.hotel}</th>
                <th className="py-1 pr-3 font-medium">{t.lastScan}</th>
                <th className="py-1 pr-3 font-medium">{t.statsDate}</th>
                <th className="py-1 pr-3 font-medium">{t.scanned}</th>
                <th className="py-1 pr-3 font-medium">{t.catalog}</th>
                <th className="py-1 font-medium">{t.warnings}</th>
              </tr>
            </thead>
            <tbody className="text-text">
              {site.hotels.map((h) => {
                const warnings = [h.truncated && t.truncated, h.rateLimited > 0 && t.rateLimited(h.rateLimited), h.errors > 0 && t.errorsN(h.errors)].filter(Boolean);
                return (
                  <tr key={h.hotel} className="border-t border-line">
                    <td className="py-1.5 pr-3 font-medium">{h.hotel}</td>
                    <td className="py-1.5 pr-3">{when(h.generatedAt)}</td>
                    <td className="py-1.5 pr-3">{h.statsDate ?? "—"}</td>
                    <td className="py-1.5 pr-3">{h.scanned === null ? "—" : `${f.int(h.scanned)} / ${f.int(h.selected)}`}</td>
                    <td className="py-1.5 pr-3">{f.int(h.catalogSize)}</td>
                    <td className={`py-1.5 ${warnings.length ? "text-accent" : "text-up"}`}>{warnings.length ? warnings.join(" · ") : t.allGood}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-text-2">
          {t.nftScan}: <span className="text-text">{when(site.nft.generatedAt)}</span>
        </p>
      </Section>

      <Section title={t.configTitle}>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-text-2">{t.cfgStore}</dt>
          <dd className="text-text">{c.store === "upstash" ? t.storeUpstash : t.storeFile}</dd>
          <dt className="text-text-2">{t.cfgMail}</dt>
          <dd className={c.mail === "smtp" ? "text-up" : "text-accent"}>{c.mail === "smtp" ? `✓ ${t.mailSmtp}` : c.mail === "outbox" ? t.mailOutbox : `✕ ${t.mailOff}`}</dd>
          <dt className="text-text-2">{t.cfgChannels}</dt>
          <dd className="text-text">{c.channels.length ? c.channels.join(", ") : t.none}</dd>
          <dt className="text-text-2">{t.cfgSession}</dt>
          <dd className="text-text">{yesNo(c.sessionSecret)}</dd>
          <dt className="text-text-2">{t.cfgCron}</dt>
          <dd className="text-text">{yesNo(c.cronSecret)}</dd>
          <dt className="text-text-2">{t.cfgSite}</dt>
          <dd className="break-all text-text">{c.siteUrl ?? "—"}</dd>
          <dt className="text-text-2">{t.cfgAdmins}</dt>
          <dd className="text-text">{c.admins}</dd>
          <dt className="text-text-2">{t.cfgUsers}</dt>
          <dd className="text-text">{f.int(site.users)}</dd>
        </dl>
      </Section>

      <Section title={t.actionsTitle}>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} className={btn} onClick={() => void act("revalidate", {}, () => t.revalidated)}>
            {t.revalidate}
          </button>
          <button
            type="button"
            disabled={busy}
            className={btn}
            onClick={() =>
              void act("test-channels", {}, (res) => {
                const names = (res.data.channels as string[]) ?? [];
                return names.length ? t.testOk(names.join(", ")) : t.noChannels;
              }).then(() => undefined)
            }
          >
            {t.testChannels}
          </button>
          <button type="button" disabled={busy} className={btn} onClick={() => void act("rebuild", {}, (res) => t.rebuilt(Number(res.data.count) || 0))}>
            {t.rebuild}
          </button>
        </div>
      </Section>

      <Section title={`${t.usersTitle} (${f.int(users.search ? users.rows.length : users.total)})`}>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setMessage(null);
            void loadUsers(0, query.trim(), false);
          }}
        >
          <label className="sr-only" htmlFor="admin-search">
            {t.search}
          </label>
          <input
            id="admin-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search}
            maxLength={254}
            className={`${input} min-w-0 flex-1 basis-56`}
          />
          <button type="submit" className={btn}>
            {t.searchSubmit}
          </button>
          {users.search && (
            <button
              type="button"
              className={btn}
              onClick={() => {
                setQuery("");
                void loadUsers(0, "", false);
              }}
            >
              {t.showAll}
            </button>
          )}
        </form>

        {users.rows.length === 0 ? (
          <p className="text-sm text-text-2">{users.search ? t.noResults : t.noUsers}</p>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="text-text-2">
                <tr>
                  <th className="py-1 pr-3 font-medium">{t.colUser}</th>
                  <th className="py-1 pr-3 font-medium">{t.colEmail}</th>
                  <th className="py-1 pr-3 font-medium">{t.colCreated}</th>
                  <th className="py-1 pr-3 font-medium">{t.colLast}</th>
                  <th className="py-1 pr-3 font-medium">{t.colAlerts}</th>
                  <th className="py-1 pr-3 font-medium">{t.colState}</th>
                  <th className="py-1 pr-3 font-medium">{t.colPlan}</th>
                  <th className="py-1 font-medium">{t.colActions}</th>
                </tr>
              </thead>
              <tbody className="text-text">
                {users.rows.map((r) => (
                  <tr key={r.u} className="border-t border-line align-top">
                    <td className="py-1.5 pr-3 font-medium">
                      {r.name} {r.u === me && <span className="text-text-2">{t.you}</span>}
                    </td>
                    <td className="py-1.5 pr-3">
                      <span className="block">{r.email || "—"}</span>
                      {r.email && <span className={`text-xs ${r.emailVerified ? "text-up" : "text-text-2"}`}>{r.emailVerified ? t.verified : t.unverified}</span>}
                    </td>
                    <td className="py-1.5 pr-3">{ms(r.createdAt)}</td>
                    <td className="py-1.5 pr-3">{ms(r.lastLoginAt)}</td>
                    <td className="py-1.5 pr-3">{f.int(r.rules)}</td>
                    <td className={`py-1.5 pr-3 ${r.banned ? "text-down" : "text-up"}`}>{r.banned ? t.banned : t.active}</td>
                    <td className={`py-1.5 pr-3 ${r.plan === "vip" ? "font-bold text-accent" : "text-text-2"}`}>{r.plan === "vip" ? "VIP" : "Standard"}</td>
                    <td className="py-1.5">
                      {confirming === r.u ? (
                        <form
                          className="space-y-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            void act("delete", { u: r.u, confirm: confirmText }, () => t.done);
                          }}
                        >
                          <label className="block text-xs text-text-2" htmlFor={`confirm-${r.u}`}>
                            {t.confirmDelete(r.name)}
                          </label>
                          <input id={`confirm-${r.u}`} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className={input} autoComplete="off" />
                          <div className="flex flex-wrap gap-2">
                            <button type="submit" disabled={busy} className="rounded-lg bg-down px-3 py-1.5 text-sm font-medium text-[#1a0606] disabled:opacity-60">
                              {t.confirmDeleteSubmit}
                            </button>
                            <button type="button" className={btn} onClick={() => (setConfirming(null), setConfirmText(""))}>
                              {t.cancel}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {r.u !== me && (
                            <button type="button" disabled={busy} className={btn} onClick={() => void act("ban", { u: r.u, banned: !r.banned }, () => t.done)}>
                              {r.banned ? t.unban : t.ban}
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busy}
                            className={btn}
                            onClick={() => void act("plan", { u: r.u, plan: r.plan === "vip" ? "standard" : "vip" }, () => t.done)}
                          >
                            {r.plan === "vip" ? t.removeVip : t.giveVip}
                          </button>
                          <button type="button" disabled={busy} className={btn} title={t.unlockHint} onClick={() => void act("unlock", { u: r.u }, () => t.done)}>
                            {t.unlock}
                          </button>
                          {r.u !== me && (
                            <button type="button" disabled={busy} className={`${btn} text-down`} onClick={() => (setConfirming(r.u), setConfirmText(""))}>
                              {t.del}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!users.search && users.rows.length < users.total && (
          <button type="button" className={btn} onClick={() => void loadUsers(users.offset + 25, "", true)}>
            {t.more}
          </button>
        )}
      </Section>

      <Section title={t.logTitle}>
        {log.length === 0 ? (
          <p className="text-sm text-text-2">{t.logEmpty}</p>
        ) : (
          <ul className="space-y-1 text-sm text-text">
            {log.map((e, i) => (
              <li key={`${e.at}-${i}`}>
                <span className="text-text-2">{f.dayTime(e.at)}</span> · <strong>{e.admin}</strong> {t.logActions[e.action] ?? e.action}
                {e.target ? ` ${e.target}` : ""}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
