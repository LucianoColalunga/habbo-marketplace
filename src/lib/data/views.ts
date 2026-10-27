import { cacheLife, cacheTag } from "next/cache";
import type { CatalogItem } from "@/lib/habbo/furnidata";
import { HOTELS, type HotelCode } from "@/lib/hotels";
import { marketFlow, type MarketFlow } from "@/lib/market/flow";
import type { DayPoint, SnapPoint } from "@/lib/market/history";
import type { ItemSummary } from "@/lib/market/stats";
import type { MarketSummary, ScanReport } from "@/lib/market/summary";
import { isSafeClassname } from "@/lib/habbo/api";
import { rankMatches } from "@/lib/search";
import { LANGS, type Lang } from "@/lib/i18n/config";
import {
  buildCategoryIndex,
  categoryBySlug,
  CATEGORIES,
  matchCategories,
  subcategoriesOf,
  type CategoryIndex,
  type CategoryMatch,
} from "@/lib/market/categories";
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

/* ---------- Categorías ---------- */

export interface CategoryRow {
  k: string;
  n: string;
  r: number;
  cp: number;
  oo: number;
  s30: number;
  a7: number | null;
  /** Suelo o pared (lo necesita la consulta en vivo). */
  t: "r" | "w";
  /** Grupo que se muestra arriba del nombre: la subcategoría (o la categoría, en "Todos"). */
  g?: string;
}

/** Como mucho, cuántos furnis se muestran en la página de una categoría. */
export const CATEGORY_LIMIT = 500;

const categoryMemo = new Map<string, { hash: string; index: CategoryIndex }>();

/** Clasificación del catálogo de un hotel (se calcula una vez por versión del catálogo). */
async function categoriesOf(hotel: HotelCode): Promise<{ index: CategoryIndex; catalog: CatalogIndex } | null> {
  // En los hoteles con nombres en otro idioma (.de, .fr, .it, .nl, .fi, .com.tr) se
  // suma el nombre en inglés del mismo furni, que es el que conocen las reglas.
  const otherLang = !(LANGS as readonly string[]).includes(HOTELS[hotel].lang);
  const [catalog, english] = await Promise.all([loadCatalog(hotel), otherLang ? loadCatalog("com") : null]);
  if (!catalog) return null;
  const hash = `${catalog.catalog.hash}:${english?.catalog.hash ?? ""}`;
  const hit = categoryMemo.get(hotel);
  if (hit && hit.hash === hash) return { index: hit.index, catalog };
  const index = buildCategoryIndex(catalog.catalog.items, english ? (k) => english.byKey.get(k)?.n : undefined);
  categoryMemo.set(hotel, { hash, index });
  return { index, catalog };
}

function rowsFor(keys: string[], catalog: CatalogIndex, summary: MarketSummary | null, groups?: Map<string, string>): CategoryRow[] {
  return keys
    .map((k) => {
      const item = catalog.byKey.get(k);
      const s = summary?.items[k];
      const g = groups?.get(k);
      const t: "r" | "w" = item?.t === "w" ? "w" : "r";
      return { k, n: item?.n ?? k, r: item?.r ?? 0, t, cp: s?.cp ?? 0, oo: s?.oo ?? 0, s30: s?.s30 ?? 0, a7: s?.a7 ?? null, ...(g ? { g } : {}) };
    })
    .sort((a, b) => b.s30 - a.s30 || b.oo - a.oo || a.n.localeCompare(b.n));
}

/** A qué grupo pertenece cada furni: el primero de la lista en el que aparece. */
function groupsOf(index: CategoryIndex, ids: { id: string; key: string }[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const { id, key } of ids) for (const k of index.members[key] ?? []) if (!out.has(k)) out.set(k, id);
  return out;
}

export interface CategoryCard {
  slug: string;
  count: number;
  /** Los furnis más vendidos de la categoría, para mostrar su ícono. */
  icons: { k: string; r: number }[];
  subs: { slug: string; count: number }[];
}

export async function getCategoryOverview(hotel: HotelCode): Promise<CategoryCard[]> {
  "use cache";
  cacheLife("market");
  cacheTag(`market:${hotel}`);
  const [data, summary] = await Promise.all([categoriesOf(hotel), loadSummary(hotel)]);
  if (!data) return [];
  return CATEGORIES.map((c) => {
    const keys = data.index.members[c.slug] ?? [];
    return {
      slug: c.slug,
      count: keys.length,
      icons: rowsFor(keys, data.catalog, summary)
        .slice(0, 3)
        .map((r) => ({ k: r.k, r: r.r })),
      subs: subcategoriesOf(data.index, c),
    };
  }).filter((c) => c.count > 0);
}

export interface CategoryView {
  total: number;
  rows: CategoryRow[];
  subs: { slug: string; count: number }[];
  generatedAt: string | null;
}

/** Furnis de una categoría o subcategoría, los más vendidos primero. null si no existe. */
export async function getCategoryView(hotel: HotelCode, cat: string, sub: string | null): Promise<CategoryView | null> {
  "use cache";
  cacheLife("market");
  cacheTag(`market:${hotel}`);
  const def = categoryBySlug(cat);
  if (!def) return null;
  const [data, summary] = await Promise.all([categoriesOf(hotel), loadSummary(hotel)]);
  if (!data) return { total: 0, rows: [], subs: [], generatedAt: summary?.generatedAt ?? null };
  const keys = data.index.members[sub ? `${cat}/${sub}` : cat];
  if (!keys) return sub ? null : { total: 0, rows: [], subs: [], generatedAt: summary?.generatedAt ?? null };
  const subs = subcategoriesOf(data.index, def);
  const groups = groupsOf(
    data.index,
    (sub ? subs.filter((s) => s.slug === sub) : subs).map((s) => ({ id: s.slug, key: `${cat}/${s.slug}` })),
  );
  return {
    total: keys.length,
    rows: rowsFor(keys, data.catalog, summary, groups).slice(0, CATEGORY_LIMIT),
    subs,
    generatedAt: summary?.generatedAt ?? null,
  };
}

/** Todo el catálogo (los más vendidos primero), para la portada del catálogo. */
export async function getCatalogAll(hotel: HotelCode): Promise<Omit<CategoryView, "subs">> {
  "use cache";
  cacheLife("market");
  cacheTag(`market:${hotel}`);
  const [data, summary] = await Promise.all([categoriesOf(hotel), loadSummary(hotel)]);
  if (!data) return { total: 0, rows: [], generatedAt: summary?.generatedAt ?? null };
  const keys = [...data.catalog.byKey.keys()];
  const groups = groupsOf(
    data.index,
    CATEGORIES.map((c) => ({ id: c.slug, key: c.slug })),
  );
  return {
    total: keys.length,
    rows: rowsFor(keys, data.catalog, summary, groups).slice(0, CATEGORY_LIMIT),
    generatedAt: summary?.generatedAt ?? null,
  };
}

/** Categorías que coinciden con una búsqueda ("pisos", "sofás"...). */
export async function searchCategories(hotel: HotelCode, query: string, lang: Lang): Promise<CategoryMatch[]> {
  "use cache";
  cacheLife("market");
  cacheTag(`market:${hotel}`);
  const data = await categoriesOf(hotel);
  return data ? matchCategories(data.index, query.slice(0, 60), lang) : [];
}

/* ---------- Movimiento por día ---------- */

/** Vendidas, créditos y publicaciones por día de todo el hotel. */
export async function getMarketFlow(hotel: HotelCode): Promise<MarketFlow> {
  "use cache";
  cacheLife("market");
  cacheTag(`market:${hotel}`);
  const [summary, history] = await Promise.all([loadSummary(hotel), loadHistory(hotel)]);
  const items = summary?.items ?? {};
  return marketFlow(Object.keys(items), history, items, Date.now());
}

/** Lo mismo, de una categoría o subcategoría (null si no existe). */
export async function getCategoryFlow(hotel: HotelCode, cat: string, sub: string | null): Promise<MarketFlow | null> {
  "use cache";
  cacheLife("market");
  cacheTag(`market:${hotel}`);
  const [data, summary, history] = await Promise.all([categoriesOf(hotel), loadSummary(hotel), loadHistory(hotel)]);
  if (!data) return null;
  const keys = data.index.members[sub ? `${cat}/${sub}` : cat];
  if (!keys) return null;
  return marketFlow(keys, history, summary?.items ?? {}, Date.now());
}
