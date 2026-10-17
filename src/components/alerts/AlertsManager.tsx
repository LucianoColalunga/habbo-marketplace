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
import { describeRule, newRuleId, type RuleMode } from "@/lib/alerts/rules";
import { enableNotifications, notificationPermission, showNotification } from "@/lib/alerts/browser-notify";
import { HOTELS, type HotelCode } from "@/lib/hotels";
import { formatPrice } from "@/lib/format";
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
        <h2 className="font-display text-xl font-bold text-text">Para que te lleguen los avisos</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-text-2">
          <li>
            Activá las notificaciones. El navegador te va a preguntar si das permiso: elegí <strong className="text-text">Permitir</strong>.
          </li>
          <li>Dejá abierta una pestaña de Furnímetro. Puede estar minimizada; si la cerrás, no llegan avisos.</li>
          <li>Tu lista se guarda en este navegador. En otro celular o computadora la tenés que armar de nuevo.</li>
        </ol>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {permission === "granted" ? (
            <label className="flex items-center gap-2 text-text">
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) => saveSettings({ ...settings, notifications: e.target.checked })}
              />
              Mostrar notificaciones del navegador
            </label>
          ) : permission === "unsupported" ? (
            <span className="text-text-2">Este navegador no muestra notificaciones: los avisos van a aparecer dentro de la página.</span>
          ) : permission === "denied" ? (
            <span className="text-text-2">
              Bloqueaste las notificaciones de este sitio. Podés habilitarlas tocando el candado junto a la dirección; mientras
              tanto, los avisos aparecen dentro de la página.
            </span>
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
              Activar notificaciones
            </button>
          )}
          <label className="flex items-center gap-2 text-text-2">
            Revisar cada
            <select
              value={settings.intervalMin}
              onChange={(e) => saveSettings({ ...settings, intervalMin: Number(e.target.value) })}
              className="rounded-lg border border-line bg-surface px-2 py-1 text-text"
            >
              {[2, 5, 10, 15, 30].map((m) => (
                <option key={m} value={m}>
                  {m} minutos
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
            {checking ? "Revisando…" : "Revisar ahora"}
          </button>
          {permission === "granted" && settings.notifications && (
            <button
              type="button"
              onClick={() => void showNotification("Furnímetro", "Así se ven los avisos de ofertas.", `/${hotel}/alertas`)}
              className="text-text-2 underline hover:text-text"
            >
              Probar aviso
            </button>
          )}
        </div>
        <p className="text-sm text-muted">
          Último chequeo: {lastRun ? <TimeAgo iso={new Date(lastRun).toISOString()} /> : "todavía ninguno"}.
        </p>
      </section>

      <AddRuleForm hotel={hotel} hotels={hotels} />

      <section>
        <h2 className="mb-3 font-display text-xl font-bold text-text">Mi lista ({rules.length})</h2>
        {rules.length === 0 ? (
          <p className="card p-6 text-sm text-muted">
            Todavía no vigilás ningún furni. Agregalo arriba o desde su ficha con el botón «Vigilar precio».
          </p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-text-2">
                <tr className="border-b border-line">
                  <th className="px-3 py-2 font-medium">Furni</th>
                  <th className="px-3 py-2 font-medium">Condición</th>
                  <th className="px-3 py-2 text-right font-medium">Precio mínimo</th>
                  <th className="px-3 py-2 text-right font-medium">Promedio</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => {
                  const c = checks[r.id];
                  return (
                    <tr key={r.id} className="border-b border-line/60 last:border-0">
                      <td className="px-3 py-2">
                        <Link href={`/${r.hotel}/furni/${encodeURIComponent(r.item)}`} className="flex items-center gap-3">
                          <FurniIcon k={r.item} r={r.r} size={32} />
                          <span>
                            <span className="block text-text hover:underline">{r.name}</span>
                            <span className="block text-xs text-muted">{HOTELS[r.hotel].label}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-text-2">{describeRule(r)}</td>
                      <td className="px-3 py-2 text-right">{c ? c.oo > 0 ? <Credits value={c.cp} /> : "sin ofertas" : "—"}</td>
                      <td className="px-3 py-2 text-right text-text-2">{c?.ref ? formatPrice(c.ref) : "—"}</td>
                      <td className="px-3 py-2">
                        {!c ? (
                          <span className="text-muted">sin revisar</span>
                        ) : c.triggered ? (
                          <span className="text-up">✓ cumple</span>
                        ) : (
                          <span className="text-text-2">• no cumple</span>
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
                          aria-label={`Quitar alerta de ${r.name}`}
                        >
                          Quitar
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
        <h2 className="mb-2 font-display text-xl font-bold text-text">Ofertas detectadas para tu lista</h2>
        <DetectionsList />
      </section>

    </div>
  );
}

function AddRuleForm({ hotel, hotels }: { hotel: HotelCode; hotels: HotelCode[] }) {
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
    if (!picked) return setError("Elegí un furni de la lista.");
    const n = Number(value.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0 || (mode === "below_avg" && n >= 100)) {
      return setError(mode === "below_avg" ? "Poné un porcentaje entre 1 y 99." : "Poné un precio mayor a 0.");
    }
    addRule({ id: newRuleId(), hotel: target, item: picked.k, mode, value: n, name: picked.n, t: picked.t, r: picked.r, createdAt: Date.now() });
    setPicked(null);
    setQuery("");
    setError("");
  };

  return (
    <section className="card space-y-3 p-4">
      <h2 className="font-display text-xl font-bold text-text">Agregar un furni a vigilar</h2>
      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1 text-text-2">
          Hotel
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
            Furni
            <input
              value={picked ? picked.n : query}
              onChange={(e) => (setPicked(null), setQuery(e.target.value))}
              placeholder="Escribí el nombre…"
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
          Condición
          <select
            value={mode}
            onChange={(e) => {
              const m = e.target.value as RuleMode;
              setMode(m);
              setValue(m === "below_avg" ? "20" : "");
            }}
            className="rounded-lg border border-line bg-surface px-2 py-1.5 text-text"
          >
            <option value="below_avg">% por debajo del promedio</option>
            <option value="below_price">precio máximo (créditos)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-text-2">
          {mode === "below_avg" ? "Porcentaje" : "Créditos"}
          <input
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-24 rounded-lg border border-line bg-surface px-2 py-1.5 text-text"
          />
        </label>
        <button type="button" onClick={save} className="rounded-lg bg-accent px-4 py-1.5 font-medium text-accent-ink">
          Agregar
        </button>
      </div>
      {error && <p className="text-sm text-down">{error}</p>}
    </section>
  );
}
