"use client";

import { useEffect, useState } from "react";
import { HOTELS, type HotelCode } from "@/lib/hotels";
import { fetchLive, LiveLimitError } from "@/lib/habbo/live-client";
import { referencePrice, summarize } from "@/lib/market/stats";
import { evaluateRule, shouldNotify } from "@/lib/alerts/rules";
import { showNotification } from "@/lib/alerts/browser-notify";
import {
  addDetections,
  loadLastChecks,
  loadLastRun,
  loadNotifyState,
  loadRules,
  loadSettings,
  saveLastChecks,
  saveLastRun,
  saveNotifyState,
  type Detection,
} from "@/lib/alerts/local";
import { useI18n } from "@/lib/i18n/client";

type I18n = ReturnType<typeof useI18n>;

const LEADER_KEY = "fm:leader";
let tabIdValue: string | null = null;
/** Identificador de esta pestaña (se crea recién en el navegador). */
function tabId(): string {
  tabIdValue ??= Math.random().toString(36).slice(2);
  return tabIdValue;
}

/** Una sola pestaña hace los chequeos: la que tiene el "turno" vigente. */
function isLeader(now: number): boolean {
  try {
    const raw = JSON.parse(localStorage.getItem(LEADER_KEY) ?? "null") as { id: string; at: number } | null;
    if (!raw || raw.id === tabId() || now - raw.at > 90_000) {
      localStorage.setItem(LEADER_KEY, JSON.stringify({ id: tabId(), at: now }));
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

/** Revisa la lista guardada en el navegador y avisa (en el idioma de la página) lo que cumpla. */
export async function runBrowserCheck({ t, f, href }: I18n): Promise<{ checked: number; detections: Detection[]; error?: string }> {
  const rules = loadRules();
  if (rules.length === 0) return { checked: 0, detections: [] };
  const now = Date.now();
  saveLastRun(now);
  const state = loadNotifyState();
  const last = loadLastChecks();
  const found: Detection[] = [];
  let checked = 0;
  let error: string | undefined;
  const byHotel = new Map<HotelCode, typeof rules>();
  for (const r of rules) byHotel.set(r.hotel, [...(byHotel.get(r.hotel) ?? []), r]);

  for (const [hotel, list] of byHotel) {
    try {
      const unique = [...new Map(list.map((r) => [r.item, { name: r.item, type: r.t }])).values()];
      const { stats } = await fetchLive(hotel, unique, { force: true });
      for (const rule of list) {
        const s = stats.get(rule.item);
        if (!s) continue;
        checked++;
        const summary = summarize(s);
        const check = evaluateRule(rule, { cp: summary.cp, oo: summary.oo, ref: referencePrice(summary) });
        last[rule.id] = { cp: check.price, oo: check.offers, ref: check.ref, triggered: check.triggered, at: now };
        const decision = shouldNotify(check, state[rule.id], now);
        state[rule.id] = decision.next;
        if (decision.notify) {
          found.push({
            id: `${rule.id}-${now}`,
            ruleId: rule.id,
            hotel,
            item: rule.item,
            name: rule.name,
            price: check.price,
            ref: check.ref,
            belowRef: check.belowRef,
            offers: check.offers,
            at: now,
          });
        }
      }
    } catch (e) {
      error = e instanceof LiveLimitError ? t.deals.limit : t.watcher.failed(HOTELS[hotel].label);
    }
  }
  saveNotifyState(state);
  saveLastChecks(last);
  addDetections(found);
  if (loadSettings().notifications) {
    for (const d of found) {
      await showNotification(
        t.watcher.notifTitle(d.name, d.price),
        t.watcher.notifBody(HOTELS[d.hotel as HotelCode].label, d.offers, d.belowRef !== null ? f.pct(d.belowRef, false) : null),
        href(`/${d.hotel}/furni/${encodeURIComponent(d.item)}`),
      );
    }
  }
  window.dispatchEvent(new CustomEvent("fm:detections", { detail: found }));
  return { checked, detections: found, error };
}

/** Vigilante en segundo plano (mientras haya una pestaña abierta) + aviso dentro de la página. */
export function AlertWatcher() {
  const i18n = useI18n();
  const { t, f, href } = i18n;
  const [toast, setToast] = useState<Detection[]>([]);

  useEffect(() => {
    let running = false;
    const tick = async (force = false) => {
      if (running) return;
      const now = Date.now();
      if (!isLeader(now) && !force) return;
      const { intervalMin } = loadSettings();
      if (!force && now - loadLastRun() < intervalMin * 60_000) return;
      if (loadRules().length === 0) return;
      running = true;
      try {
        await runBrowserCheck(i18n);
      } finally {
        running = false;
      }
    };
    const id = setInterval(() => void tick(), 30_000);
    const first = setTimeout(() => void tick(), 4_000);
    const onNow = () => void tick(true);
    const onDetections = (e: Event) => {
      const list = (e as CustomEvent<Detection[]>).detail;
      if (list?.length) setToast(list);
    };
    window.addEventListener("fm:check-now", onNow);
    window.addEventListener("fm:detections", onDetections);
    return () => {
      clearInterval(id);
      clearTimeout(first);
      window.removeEventListener("fm:check-now", onNow);
      window.removeEventListener("fm:detections", onDetections);
    };
    // El idioma solo cambia al navegar a otra versión de la página (otro árbol).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.lang]);

  if (toast.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(92vw,360px)] rounded-xl border border-accent/50 bg-surface-2 p-4 shadow-2xl shadow-black/50" role="alert">
      <div className="mb-2 flex items-center justify-between">
        <strong className="text-text">{t.watcher.title}</strong>
        <button type="button" onClick={() => setToast([])} className="text-sm text-text-2 hover:text-text" aria-label={t.watcher.closeAria}>
          ✕
        </button>
      </div>
      <ul className="space-y-1 text-sm">
        {toast.slice(0, 4).map((d) => (
          <li key={d.id}>
            <a className="text-accent hover:underline" href={href(`/${d.hotel}/furni/${encodeURIComponent(d.item)}`)}>
              {d.name}
            </a>{" "}
            <span className="text-text-2">{t.watcher.line(d.price, d.belowRef !== null ? f.pct(d.belowRef, false) : null)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
