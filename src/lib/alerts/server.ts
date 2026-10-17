import { fetchMany, type ItemRef } from "@/lib/habbo/api";
import type { Catalog } from "@/lib/habbo/furnidata";
import { HOTELS, type HotelCode } from "@/lib/hotels";
import { findDeals } from "@/lib/market/deals";
import { referencePrice, summarize, type ItemSummary } from "@/lib/market/stats";
import type { MarketSummary } from "@/lib/market/summary";
import { getStorage, keys, type Storage } from "@/lib/storage";
import { configuredChannels, type Channel } from "./notifiers";
import { describeRule, evaluateRule, parseRules, shouldNotify, type NotifyState, type RuleCheck, type WatchRule } from "./rules";

/**
 * Alertas del lado del servidor (Discord / Telegram). Se ejecutan:
 * - después de cada escaneo (con los datos recién bajados), y
 * - en /api/cron/alerts, que consulta en vivo solo los furnis de las reglas.
 * Las reglas salen de la variable ALERTS_RULES (JSON exportado desde /alertas).
 */

interface AlertState {
  v: 1;
  entries: Record<string, NotifyState>;
}

export interface AlertRunResult {
  rules: number;
  matched: number;
  sent: number;
  channels: string[];
  errors: string[];
}

export interface AlertRunOptions {
  /** Si viene, se evalúa solo ese hotel con el resumen recién calculado. */
  hotel?: HotelCode;
  summary?: MarketSummary;
  storage?: Storage;
  fetchImpl?: typeof fetch;
  env?: NodeJS.ProcessEnv;
  channels?: Channel[];
  now?: () => number;
}

export function rulesFromEnv(env: NodeJS.ProcessEnv = process.env): WatchRule[] {
  if (!env.ALERTS_RULES) return [];
  try {
    return parseRules(JSON.parse(env.ALERTS_RULES));
  } catch {
    return [];
  }
}

export function siteUrl(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.SITE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
  return raw.replace(/\/+$/, "");
}

function itemUrl(base: string, hotel: HotelCode, item: string) {
  return base ? `${base}/${hotel}/furni/${encodeURIComponent(item)}` : "";
}

const STATE_TTL_MS = 14 * 86_400_000;

export async function runServerAlerts(options: AlertRunOptions = {}): Promise<AlertRunResult> {
  const env = options.env ?? process.env;
  const now = options.now ?? Date.now;
  const fetchImpl = options.fetchImpl ?? fetch;
  const result: AlertRunResult = { rules: 0, matched: 0, sent: 0, channels: [], errors: [] };

  let channels: Channel[];
  try {
    channels = options.channels ?? configuredChannels(env, fetchImpl);
  } catch (error) {
    result.errors.push((error as Error).message);
    return result;
  }
  result.channels = channels.map((c) => c.name);

  const allRules = rulesFromEnv(env);
  const rules = options.hotel ? allRules.filter((r) => r.hotel === options.hotel) : allRules;
  result.rules = rules.length;
  const dealMin = Number(env.ALERTS_DEALS_MIN_DISCOUNT);
  const dealsEnabled = Boolean(options.summary) && Number.isFinite(dealMin) && dealMin > 0 && dealMin < 100;
  if (channels.length === 0 || (rules.length === 0 && !dealsEnabled)) return result;

  const storage = options.storage ?? (await getStorage());
  const stateObj = (await storage.read<AlertState>(keys.alertState()))?.data ?? { v: 1, entries: {} };
  const state = stateObj.entries;
  const base = siteUrl(env);
  const lines: string[] = [];
  let changed = false;

  // 1) Reglas propias.
  const snapshots = await currentValues(rules, options, storage, fetchImpl, result.errors);
  const names = await catalogNames(
    [...new Set(rules.map((r) => r.hotel))],
    storage,
  );
  for (const rule of rules) {
    const s = snapshots.get(`${rule.hotel}:${rule.item}`);
    if (!s) continue;
    const check: RuleCheck = evaluateRule(rule, { cp: s.cp, oo: s.oo, ref: referencePrice(s) });
    const key = `rule:${rule.id}`;
    const decision = shouldNotify(check, state[key], now());
    if (JSON.stringify(state[key]) !== JSON.stringify(decision.next)) {
      state[key] = decision.next;
      changed = true;
    }
    if (check.triggered) result.matched++;
    if (decision.notify) {
      const name = names.get(`${rule.hotel}:${rule.item}`) ?? rule.item;
      const below = check.belowRef !== null ? ` (${Math.round(check.belowRef * 100)} % bajo el promedio)` : "";
      lines.push(
        `🔔 ${name} en ${HOTELS[rule.hotel].label}: ${check.price} créditos${below}. ` +
          `Regla: ${describeRule(rule)}. ${check.offers} ofertas. ${itemUrl(base, rule.hotel, rule.item)}`.trim(),
      );
    }
  }

  // 2) Ofertas generales detectadas en el escaneo (opcional).
  if (dealsEnabled && options.summary) {
    const hotel = options.summary.hotel;
    const deals = findDeals(hotel, options.summary.items, { minDiscount: dealMin / 100 }).slice(0, 15);
    const dealNames = await catalogNames([hotel], storage);
    const current = new Set(deals.map((d) => `deal:${hotel}:${d.k}`));
    for (const [key, entry] of Object.entries(state)) {
      if (key.startsWith(`deal:${hotel}:`) && entry.active && !current.has(key)) {
        state[key] = { ...entry, active: false };
        changed = true;
      }
    }
    for (const d of deals) {
      const key = `deal:${hotel}:${d.k}`;
      const check = { triggered: true, price: d.cp } as RuleCheck;
      const decision = shouldNotify(check, state[key], now());
      if (JSON.stringify(state[key]) !== JSON.stringify(decision.next)) {
        state[key] = decision.next;
        changed = true;
      }
      result.matched++;
      if (decision.notify) {
        lines.push(
          `💸 ${dealNames.get(`${hotel}:${d.k}`) ?? d.k} en ${HOTELS[hotel].label}: ${d.cp} créditos, ` +
            `${Math.round(d.pct * 100)} % bajo su promedio (${Math.round(d.ref)}). ${itemUrl(base, hotel, d.k)}`.trim(),
        );
      }
    }
  }

  // Limpieza de estados viejos.
  for (const [key, entry] of Object.entries(state)) {
    if (!entry.active && now() - entry.at > STATE_TTL_MS) {
      delete state[key];
      changed = true;
    }
  }

  if (lines.length > 0) {
    const text = `Furnímetro — ${lines.length} aviso(s)\n${lines.join("\n")}`;
    for (const channel of channels) {
      try {
        await channel.send(text);
      } catch (error) {
        result.errors.push(`${channel.name}: ${(error as Error).message}`);
      }
    }
    result.sent = lines.length;
  }
  // Solo se escribe si algo cambió, para no gastar operaciones de almacenamiento.
  if (changed) await storage.write(keys.alertState(), { v: 1, entries: state } satisfies AlertState);
  return result;
}

async function catalogNames(hotels: HotelCode[], storage: Storage): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  for (const hotel of hotels) {
    const catalog = (await storage.read<Catalog>(keys.catalog(hotel)))?.data;
    for (const item of catalog?.items ?? []) names.set(`${hotel}:${item.k}`, item.n);
  }
  return names;
}

/** Valores actuales de cada furni de las reglas: del escaneo recién hecho o consultando la API. */
async function currentValues(
  rules: WatchRule[],
  options: AlertRunOptions,
  storage: Storage,
  fetchImpl: typeof fetch,
  errors: string[],
): Promise<Map<string, ItemSummary>> {
  const out = new Map<string, ItemSummary>();
  if (rules.length === 0) return out;
  if (options.summary) {
    for (const rule of rules) {
      const s = options.summary.items[rule.item];
      if (s && rule.hotel === options.summary.hotel) out.set(`${rule.hotel}:${rule.item}`, s);
    }
    return out;
  }
  const byHotel = new Map<HotelCode, Set<string>>();
  for (const r of rules) {
    if (!byHotel.has(r.hotel)) byHotel.set(r.hotel, new Set());
    byHotel.get(r.hotel)!.add(r.item);
  }
  for (const [hotel, items] of byHotel) {
    const catalog = (await storage.read<Catalog>(keys.catalog(hotel)))?.data;
    const types = new Map(catalog?.items.map((i) => [i.k, i.t]) ?? []);
    const refs: ItemRef[] = [...items].map((name) => ({ name, type: types.get(name) ?? "r" }));
    const res = await fetchMany(hotel, refs, { fetchImpl, intervalMs: 5000 });
    errors.push(...res.errors);
    for (const stats of res.results) out.set(`${hotel}:${stats.item}`, summarize(stats));
  }
  return out;
}
