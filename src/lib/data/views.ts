import { cacheLife, cacheTag } from "next/cache";
import type { CatalogItem } from "@/lib/habbo/furnidata";
import type { HotelCode } from "@/lib/hotels";
import type { DayPoint, SnapPoint } from "@/lib/market/history";
import type { ItemSummary } from "@/lib/market/stats";
import type { MarketSummary, ScanReport } from "@/lib/market/summary";
import { isSafeClassname } from "@/lib/habbo/api";
import { rankMatches } from "@/lib/search";
import { buildDeals, buildRanking, totals, toRow, type FurniRow, type MarketTotals, type RankingKind } from "./rankings";
import { loadCatalog, loadHistory, loadSummary, type CatalogIndex } from "./store";

/**
 * Vistas que consumen las páginas. Cada una devuelve datos chicos y
 * serializables, y define cuánto tiempo puede reutilizarse.
 */

export interface MarketMeta {
  hasData: boolean;
  generatedAt: string | null;
  statsDate: string | null;
  scan: ScanReport | null;
  catalogSize: number;
}

export interface HomeView {
  meta: MarketMeta;
  totals: MarketTotals | null;
  vendidos: FurniRow[];
  subas: FurniRow[];
  bajas: FurniRow[];
  ofertas: FurniRow[];
}

function refMinutes(iso: string): number {
  return Math.floor(Date.parse(iso) / 60000);
}

function metaOf(summary: MarketSummary | null, catalog: CatalogIndex | null): MarketMeta {
  return {
    hasData: Boolean(summary),
    generatedAt: summary?.generatedAt ?? null,
    statsDate: summary?.statsDate ?? null,
    scan: summary?.scan ?? null,
    catalogSize: catalog?.catalog.items.length ?? 0,
  };
}

export async function getMarketMeta(hotel: HotelCode): Promise<MarketMeta> {
  "use cache";
  cacheLife("market");
  cacheTag(`market:${hotel}`);
  const [summary, catalog] = await Promise.all([loadSummary(hotel), loadCatalog(hotel)]);
  return metaOf(summary, catalog);
}

export async function getHomeView(hotel: HotelCode): Promise<HomeView> {
  "use cache";
  cacheLife("market");
  cacheTag(`market:${hotel}`);
  const [summary, catalog] = await Promise.all([loadSummary(hotel), loadCatalog(hotel)]);
  const meta = metaOf(summary, catalog);
  if (!summary) return { meta, totals: null, vendidos: [], subas: [], bajas: [], ofertas: [] };
  const byKey = catalog?.byKey ?? new Map<string, CatalogItem>();
  const ref = refMinutes(summary.generatedAt);
  return {
    meta,
    totals: totals(summary.items),
    vendidos: buildRanking(summary.items, byKey, "vendidos", 6, ref),
    subas: buildRanking(summary.items, byKey, "subas", 6, ref),
    bajas: buildRanking(summary.items, byKey, "bajas", 6, ref),
    ofertas: buildDeals(hotel, summary.items, byKey, "pct", 6, ref),
  };
}

export async function getRankingView(hotel: HotelCode, kind: RankingKind, limit = 100): Promise<FurniRow[]> {
  "use cache";
  cacheLife("market");
  cacheTag(`market:${hotel}`);
  const [summary, catalog] = await Promise.all([loadSummary(hotel), loadCatalog(hotel)]);
  if (!summary) return [];
  return buildRanking(summary.items, catalog?.byKey ?? new Map(), kind, limit, refMinutes(summary.generatedAt));
}

export async function getDealsView(hotel: HotelCode, sort: "pct" | "saving", limit = 100): Promise<FurniRow[]> {
  "use cache";
  cacheLife("market");
  cacheTag(`market:${hotel}`);
  const [summary, catalog] = await Promise.all([loadSummary(hotel), loadCatalog(hotel)]);
  if (!summary) return [];
  return buildDeals(hotel, summary.items, catalog?.byKey ?? new Map(), sort, limit, refMinutes(summary.generatedAt));
}

export interface SearchResult extends FurniRow {
  hasActivity: boolean;
  c: string;
}

export async function searchFurni(hotel: HotelCode, query: string, limit = 24): Promise<SearchResult[]> {
  "use cache";
  cacheLife("market");
  cacheTag(`market:${hotel}`);
  const q = query.trim().slice(0, 60);
  if (q.length < 2) return [];
  const [summary, catalog] = await Promise.all([loadSummary(hotel), loadCatalog(hotel)]);
  if (!catalog) return [];
  const items = summary?.items ?? {};
  const found = rankMatches(catalog.catalog.items, q, (i) => (items[i.k]?.s30 ?? 0) * 10 + (items[i.k]?.oo ?? 0), limit);
  return found.map((item) => {
    const s = items[item.k];
    const row: FurniRow = s
      ? toRow(item.k, s, item)
      : { k: item.k, n: item.n, r: item.r, t: item.t, cp: 0, oo: 0, a7: null, ref: null, s7: 0, s30: 0, c7: 0, change: null, sp: [], at: 0 };
    return { ...row, hasActivity: Boolean(s && (s.s30 > 0 || s.oo > 0)), c: item.c };
  });
}

export interface ItemBase {
  item: CatalogItem | null;
  /** Valores del último escaneo de este furni (no existe si todavía no se escaneó). */
  summary: ItemSummary | null;
}

export async function getItemBase(hotel: HotelCode, k: string): Promise<ItemBase> {
  "use cache";
  cacheLife("market");
  cacheTag(`market:${hotel}`);
  const [summary, catalog] = await Promise.all([loadSummary(hotel), loadCatalog(hotel)]);
  return {
    item: catalog?.byKey.get(k) ?? null,
    summary: summary?.items[k] ?? null,
  };
}

export interface ItemHistoryView {
  days: DayPoint[];
  snaps: SnapPoint[];
  updatedAt: string | null;
}

export async function getItemHistory(hotel: HotelCode, k: string): Promise<ItemHistoryView> {
  "use cache";
  cacheLife("market");
  cacheTag(`market:${hotel}`);
  const history = await loadHistory(hotel);
  return { days: history?.days[k] ?? [], snaps: history?.snaps[k] ?? [], updatedAt: history?.updatedAt ?? null };
}

/** Furnis con más ventas en 30 días (para el sitemap): solo los más buscados, no los 13.700. */
export async function getTopFurniKeys(hotel: HotelCode, limit: number): Promise<{ keys: string[]; generatedAt: string | null }> {
  "use cache";
  cacheLife("market");
  cacheTag(`market:${hotel}`);
  const summary = await loadSummary(hotel);
  if (!summary) return { keys: [], generatedAt: null };
  const keys = Object.entries(summary.items)
    .filter(([k, s]) => s.s30 > 0 && isSafeClassname(k))
    .sort((a, b) => b[1].s30 - a[1].s30 || b[1].s7 - a[1].s7)
    .slice(0, limit)
    .map(([k]) => k);
  return { keys, generatedAt: summary.generatedAt };
}
