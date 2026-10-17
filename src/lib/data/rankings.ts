import type { CatalogItem } from "@/lib/habbo/furnidata";
import type { HotelCode } from "@/lib/hotels";
import { findDeals } from "@/lib/market/deals";
import { isActive, referencePrice, weeklyChange, type ItemSummary } from "@/lib/market/stats";

/** Fila liviana que se manda a las páginas. */
export interface FurniRow {
  k: string;
  n: string;
  r: number;
  t: "r" | "w";
  cp: number;
  oo: number;
  a7: number | null;
  ref: number | null;
  s7: number;
  s30: number;
  c7: number;
  change: number | null;
  /** Cuánto por debajo de la referencia está el precio mínimo (solo en ofertas). */
  pct?: number;
  sp: (number | null)[];
  /** Momento del escaneo de este furni (minutos desde 1970, UTC). */
  at: number;
}

/** Antigüedad máxima (en minutos, respecto de la última corrida) para entrar en cada lista. */
export const MAX_AGE = {
  deals: 36 * 60,
  change: 72 * 60,
  default: 7 * 24 * 60,
};

/** Filtra los furnis cuyo dato es demasiado viejo respecto de la última corrida. */
export function fresh(items: Record<string, ItemSummary>, refMin: number, maxAge: number): Record<string, ItemSummary> {
  const out: Record<string, ItemSummary> = {};
  for (const [k, s] of Object.entries(items)) if (refMin - s.at <= maxAge) out[k] = s;
  return out;
}

export const RANKINGS = {
  vendidos: { title: "Más vendidos", hint: "Unidades vendidas en los últimos 7 días." },
  volumen: { title: "Más créditos movidos", hint: "Créditos gastados en ventas en los últimos 7 días." },
  subas: { title: "Mayores subas", hint: "Promedio de los últimos 7 días contra los 7 anteriores (mínimo 5 ventas en cada semana)." },
  bajas: { title: "Mayores bajas", hint: "Promedio de los últimos 7 días contra los 7 anteriores (mínimo 5 ventas en cada semana)." },
  caros: { title: "Más caros", hint: "Precio promedio de venta más alto (con al menos 1 venta en 30 días)." },
  ofertados: { title: "Más publicados", hint: "Cantidad de ofertas abiertas al momento del escaneo." },
} as const;

export type RankingKind = keyof typeof RANKINGS;

export function isRankingKind(value: unknown): value is RankingKind {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(RANKINGS, value);
}

export function toRow(k: string, s: ItemSummary, item: CatalogItem | undefined): FurniRow {
  return {
    k,
    n: item?.n ?? k,
    r: item?.r ?? 0,
    t: s.t,
    cp: s.cp,
    oo: s.oo,
    a7: s.a7,
    ref: referencePrice(s),
    s7: s.s7,
    s30: s.s30,
    c7: s.c7,
    change: weeklyChange(s),
    sp: s.sp,
    at: s.at,
  };
}

export function buildRanking(
  items: Record<string, ItemSummary>,
  byKey: Map<string, CatalogItem>,
  kind: RankingKind,
  limit: number,
  refMin: number,
): FurniRow[] {
  const maxAge = kind === "subas" || kind === "bajas" ? MAX_AGE.change : MAX_AGE.default;
  const entries = Object.entries(fresh(items, refMin, maxAge));
  let picked: [string, ItemSummary][];
  switch (kind) {
    case "vendidos":
      picked = entries.filter(([, s]) => s.s7 > 0).sort((a, b) => b[1].s7 - a[1].s7 || b[1].c7 - a[1].c7);
      break;
    case "volumen":
      picked = entries.filter(([, s]) => s.c7 > 0).sort((a, b) => b[1].c7 - a[1].c7);
      break;
    case "subas":
    case "bajas": {
      const withChange = entries
        .map(([k, s]) => [k, s, weeklyChange(s)] as const)
        .filter(([, , c]) => c !== null && (kind === "subas" ? c > 0 : c < 0));
      withChange.sort((a, b) => (kind === "subas" ? b[2]! - a[2]! : a[2]! - b[2]!));
      picked = withChange.map(([k, s]) => [k, s]);
      break;
    }
    case "caros":
      picked = entries
        .filter(([, s]) => s.s30 > 0 && (s.a30 ?? s.ap) > 0)
        .sort((a, b) => (b[1].a30 ?? b[1].ap) - (a[1].a30 ?? a[1].ap));
      break;
    case "ofertados":
      picked = entries.filter(([, s]) => s.oo > 0).sort((a, b) => b[1].oo - a[1].oo);
      break;
  }
  return picked.slice(0, limit).map(([k, s]) => toRow(k, s, byKey.get(k)));
}

export function buildDeals(
  hotel: HotelCode,
  items: Record<string, ItemSummary>,
  byKey: Map<string, CatalogItem>,
  sort: "pct" | "saving",
  limit: number,
  refMin: number,
): FurniRow[] {
  return findDeals(hotel, fresh(items, refMin, MAX_AGE.deals), {}, sort)
    .slice(0, limit)
    .map((d) => ({ ...toRow(d.k, items[d.k], byKey.get(d.k)), pct: d.pct, ref: d.ref }));
}

export interface MarketTotals {
  active: number;
  withOffers: number;
  sold7: number;
  credits7: number;
}

export function totals(items: Record<string, ItemSummary>): MarketTotals {
  let withOffers = 0;
  let sold7 = 0;
  let credits7 = 0;
  const values = Object.values(items).filter(isActive);
  for (const s of values) {
    if (s.oo > 0) withOffers++;
    sold7 += s.s7;
    credits7 += s.c7;
  }
  return { active: values.length, withOffers, sold7, credits7 };
}
