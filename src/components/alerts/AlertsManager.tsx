"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  addRule,
  loadLastChecks,
  loadLastRun,
  loadRules,
  loadSettings,
  removeRule,
  requestCheckNow,
  saveSettings,
  useLocal,
  DEFAULT_SETTINGS,
  type AlertSettings,
  type LastCheck,
  type LocalRule,
} from "@/lib/alerts/local";
import { newRuleId, type RuleMode } from "@/lib/alerts/rules";
import { enableNotifications, notificationPermission, showNotification } from "@/lib/alerts/browser-notify";
import { HOTELS, type HotelCode } from "@/lib/hotels";
import { useI18n } from "@/lib/i18n/client";
import { describeRuleIn } from "@/lib/i18n/ui";
import { FurniIcon } from "@/components/FurniIcon";
import { TimeAgo } from "@/components/Freshness";
import { Credits } from "@/components/ui";
import { DetectionsList } from "./DetectionsList";

const NO_RULES: LocalRule[] = [];
const noSubscribe = () => () => {};
const NO_CHECKS: Record<string, LastCheck> = {};

interface SearchHit {
  k: string;
  n: string;
  r: number;
  t: "r" | "w";
}

export function AlertsManager({ hotel, hotels }: { hotel: HotelCode; hotels: HotelCode[] }) {
  const { t: ui, f, href } = useI18n();
  const t = ui.alerts;
  const rules = useLocal(loadRules, NO_RULES);
  const checks = useLocal(loadLastChecks, NO_CHECKS);
  const settings = useLocal<AlertSettings>(loadSettings, DEFAULT_SETTINGS);
  const lastRun = useLocal(loadLastRun, 0);
  // El permiso se lee del navegador; después de pedirlo se guarda la respuesta.
  const browserPermission = useSyncExternalStore(noSubscribe, notificationPermission, () => "default");
  const [asked, setPermission] = useState<string | null>(null);
  const permission = asked ?? browserPermission;
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    const done = () => setChecking(false);
    window.addEventListener("fm:detections", done);
    return () => window.removeEventListener("fm:detections", done);
  }, []);

  return (
    <div className="space-y-8">
      <section className="card space-y-4 p-4">
        <h2 className="font-display text-xl font-bold text-text">{t.howTitle}</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-text-2">
          <li>
            {t.step1} <strong className="text-text">{t.allow}</strong>.
          </li>
          <li>{t.step2}</li>
          <li>{t.step3}</li>
        </ol>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {permission === "granted" ? (
            <label className="flex items-center gap-2 text-text">
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) => saveSettings({ ...settings, notifications: e.target.checked })}
              />
              {t.showNotifs}
            </label>
          ) : permission === "unsupported" ? (
            <span className="text-text-2">{t.unsupported}</span>
          ) : permission === "denied" ? (
            <span className="text-text-2">{t.denied}</span>
          ) : (
            <button
              type="button"
              onClick={async () => {
                const result = await enableNotifications();
                setPermission(result);
                if (result === "granted") saveSettings({ ...settings, notifications: true });
              }}
              className="rounded-lg bg-accent px-3 py-1.5 font-medium text-accent-ink"
            >
              {t.enable}
            </button>
          )}
          <label className="flex items-center gap-2 text-text-2">
            {t.every}
            <select
              value={settings.intervalMin}
              onChange={(e) => saveSettings({ ...settings, intervalMin: Number(e.target.value) })}
              className="rounded-lg border border-line bg-surface px-2 py-1 text-text"
            >
              {[2, 5, 10, 15, 30].map((m) => (
                <option key={m} value={m}>
                  {t.minutes(m)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={rules.length === 0 || checking}
            onClick={() => {
              setChecking(true);
              requestCheckNow();
              setTimeout(() => setChecking(false), 15000);
            }}
            className="rounded-lg border border-line px-3 py-1.5 text-text hover:bg-surface-2 disabled:opacity-50"
          >
            {checking ? t.checking : t.checkNow}
          </button>
          {permission === "granted" && settings.notifications && (
            <button
              type="button"
              onClick={() => void showNotification("Stats", t.testBody, href(`/${hotel}/alertas`))}
              className="text-text-2 underline hover:text-text"
            >
              {t.test}
            </button>
          )}
        </div>
        <p className="text-sm text-muted">
          {t.lastCheck} {lastRun ? <TimeAgo iso={new Date(lastRun).toISOString()} /> : t.noneYet}.
        </p>
      </section>

      <AddRuleForm hotel={hotel} hotels={hotels} />

      <section>
        <h2 className="mb-3 font-display text-xl font-bold text-text">{t.myList(rules.length)}</h2>
        {rules.length === 0 ? (
          <p className="card p-6 text-sm text-muted">{t.emptyList}</p>
        ) : (
          <div className="card overflow-x-auto relative">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-text-2">
                <tr className="border-b border-line">
                  <th className="px-3 py-2 font-medium">{t.colFurni}</th>
                  <th className="px-3 py-2 font-medium">{t.colCondition}</th>
                  <th className="px-3 py-2 text-right font-medium">{t.colMin}</th>
                  <th className="px-3 py-2 text-right font-medium">{t.colAvg}</th>
                  <th className="px-3 py-2 font-medium">{t.colStatus}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => {
                  const c = checks[r.id];
                  return (
                    <tr key={r.id} className="border-b border-line/60 last:border-0">
                      <td className="px-3 py-2">
                        <Link prefetch={false} href={href(`/${r.hotel}/furni/${encodeURIComponent(r.item)}`)} className="flex items-center gap-3">
                          <FurniIcon k={r.item} r={r.r} size={32} />
                          <span>
                            <span className="block text-text hover:underline">{r.name}</span>
                            <span className="block text-xs text-muted">{HOTELS[r.hotel].label}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-text-2">{describeRuleIn(ui, r)}</td>
                      <td className="px-3 py-2 text-right">{c ? c.oo > 0 ? <Credits value={c.cp} /> : ui.common.noOffers : "—"}</td>
                      <td className="px-3 py-2 text-right text-text-2">{c?.ref ? f.price(c.ref) : "—"}</td>
                      <td className="px-3 py-2">
                        {!c ? (
                          <span className="text-muted">{t.unchecked}</span>
                        ) : c.triggered ? (
                          <span className="text-up">{t.meets}</span>
                        ) : (
                          <span className="text-text-2">{t.notMeets}</span>
                        )}
                        {c && (
                          <span className="block text-xs text-muted">
                            <TimeAgo iso={new Date(c.at).toISOString()} />
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeRule(r.id)}
                          className="text-text-2 hover:text-down"
                          aria-label={t.removeAria(r.name)}
                        >
                          {t.remove}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card p-4">
        <h2 className="mb-2 font-display text-xl font-bold text-text">{t.detectedTitle}</h2>
        <DetectionsList />
      </section>
    </div>
  );
}

function AddRuleForm({ hotel, hotels }: { hotel: HotelCode; hotels: HotelCode[] }) {
  const { t: ui } = useI18n();
  const t = ui.alerts;
  const [target, setTarget] = useState<HotelCode>(hotel);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [picked, setPicked] = useState<SearchHit | null>(null);
  const [mode, setMode] = useState<RuleMode>("below_avg");
  const [value, setValue] = useState("20");
  const [error, setError] = useState("");

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || picked) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?hotel=${target}&q=${encodeURIComponent(q)}&limit=6`, { signal: controller.signal });
        const body = (await res.json()) as { results?: SearchHit[] };
        setHits(body.results ?? []);
      } catch {
        // búsqueda cancelada
      }
    }, 200);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, target, picked]);

  const save = () => {
    if (!picked) return setError(t.errPick);
    const n = Number(value.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0 || (mode === "below_avg" && n >= 100)) {
      return setError(mode === "below_avg" ? t.errPct : t.errPrice);
    }
    addRule({ id: newRuleId(), hotel: target, item: picked.k, mode, value: n, name: picked.n, t: picked.t, r: picked.r, createdAt: Date.now() });
    setPicked(null);
    setQuery("");
    setError("");
  };

  return (
    <section className="card space-y-3 p-4">
      <h2 className="font-display text-xl font-bold text-text">{t.addTitle}</h2>
      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1 text-text-2">
          {ui.hotel.label}
          <select
            value={target}
            onChange={(e) => (setTarget(e.target.value as HotelCode), setPicked(null))}
            className="rounded-lg border border-line bg-surface px-2 py-1.5 text-text"
          >
            {hotels.map((h) => (
              <option key={h} value={h}>
                {HOTELS[h].label}
              </option>
            ))}
          </select>
        </label>
        <div className="relative min-w-60 flex-1">
          <label className="flex flex-col gap-1 text-text-2">
            {t.colFurni}
            <input
              value={picked ? picked.n : query}
              onChange={(e) => (setPicked(null), setQuery(e.target.value))}
              placeholder={t.typeName}
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-text"
            />
          </label>
          {hits.length > 0 && !picked && query.trim().length >= 2 && (
            <ul className="absolute left-0 right-0 z-20 mt-1 rounded-lg border border-line bg-surface-2 p-1 shadow-xl shadow-black/40">
              {hits.map((h) => (
                <li key={h.k}>
                  <button
                    type="button"
                    onClick={() => setPicked(h)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-surface-3"
                  >
                    <FurniIcon k={h.k} r={h.r} size={28} />
                    <span className="text-text">{h.n}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <label className="flex flex-col gap-1 text-text-2">
          {t.colCondition}
          <select
            value={mode}
            onChange={(e) => {
              const m = e.target.value as RuleMode;
              setMode(m);
              setValue(m === "below_avg" ? "20" : "");
            }}
            className="rounded-lg border border-line bg-surface px-2 py-1.5 text-text"
          >
            <option value="below_avg">{t.modeAvg}</option>
            <option value="below_price">{t.modePrice}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-text-2">
          {mode === "below_avg" ? t.percent : t.creditsLabel}
          <input
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-24 rounded-lg border border-line bg-surface px-2 py-1.5 text-text"
          />
        </label>
        <button type="button" onClick={save} className="rounded-lg bg-accent px-4 py-1.5 font-medium text-accent-ink">
          {t.add}
        </button>
      </div>
      {error && <p className="text-sm text-down">{error}</p>}
    </section>
  );
}
