import type { DayStat, FurniType, MarketStats } from "@/lib/habbo/api";

/** Resumen compacto de un furni, calculado a partir de la respuesta de la API. */
export interface ItemSummary {
  t: FurniType;
  /** Momento del escaneo de este furni, en minutos desde 1970 (UTC). */
  at: number;
  /** Precio mínimo publicado al momento del escaneo (0 = sin ofertas). */
  cp: number;
  /** Ofertas abiertas al momento del escaneo. */
  oo: number;
  /** Promedio de venta informado por Habbo (aprox. 30 días). */
  ap: number;
  /** Unidades vendidas: último día, 7 días y 30 días. */
  s1: number;
  s7: number;
  s30: number;
  /** Unidades vendidas en los 7 días anteriores a la última semana. */
  s7p: number;
  /** Créditos movidos en 7 días. */
  c7: number;
  /** Promedio ponderado de venta: últimos 7 días, los 7 anteriores y 30 días. */
  a7: number | null;
  p7: number | null;
  a30: number | null;
  /** Hace cuántos días fue la última venta registrada (1 = ayer). */
  ls: number | null;
  /** Promedio diario de los últimos 30 días (índice 0 = hace 30 días). null = sin ventas ese día. */
  sp: (number | null)[];
}

export const SPARK_DAYS = 30;

function window(history: DayStat[], from: number, to: number) {
  let sold = 0;
  let credits = 0;
  for (const h of history) {
    if (h.offset >= from && h.offset <= to) {
      sold += h.sold;
      credits += h.credits;
    }
  }
  return { sold, credits, avg: sold > 0 ? credits / sold : null };
}

function round1(n: number | null): number | null {
  return n === null ? null : Math.round(n * 10) / 10;
}

export function summarize(stats: MarketStats, at: number = Math.floor(Date.now() / 60000)): ItemSummary {
  const h = stats.history;
  const w1 = window(h, -1, -1);
  const w7 = window(h, -7, -1);
  const prev7 = window(h, -14, -8);
  const w30 = window(h, -30, -1);
  const last = h.length > 0 ? h[h.length - 1] : null;
  const sp: (number | null)[] = Array.from({ length: SPARK_DAYS }, () => null);
  for (const day of h) {
    const idx = SPARK_DAYS + day.offset; // -30 -> 0, -1 -> 29
    if (idx >= 0 && idx < SPARK_DAYS && day.sold > 0) sp[idx] = day.avg;
  }
  return {
    t: stats.type,
    at,
    cp: stats.currentPrice,
    oo: stats.currentOpenOffers,
    ap: stats.averagePrice,
    s1: w1.sold,
    s7: w7.sold,
    s30: w30.sold,
    s7p: prev7.sold,
    c7: w7.credits,
    a7: round1(w7.avg),
    p7: round1(prev7.avg),
    a30: round1(w30.avg),
    ls: last ? -last.offset : null,
    sp: sp.some((v) => v !== null) ? sp : [],
  };
}

/** Un furni "tiene actividad" si tuvo ventas en los últimos 30 días o tiene ofertas abiertas. */
export function isActive(s: ItemSummary): boolean {
  return s.s30 > 0 || s.oo > 0;
}

/** Precio de referencia para comparar: promedio de 7 días si hay volumen, si no el de 30. */
export function referencePrice(s: Pick<ItemSummary, "a7" | "s7" | "a30" | "s30" | "ap">): number | null {
  if (s.a7 !== null && s.s7 >= 3) return s.a7;
  if (s.a30 !== null && s.s30 >= 3) return s.a30;
  if (s.ap > 0 && s.s30 > 0) return s.ap;
  return null;
}

/** Variación del promedio de 7 días contra los 7 anteriores (0.1 = +10 %). */
export function weeklyChange(s: ItemSummary, minSold = 5): number | null {
  if (s.a7 === null || s.p7 === null || s.p7 <= 0) return null;
  if (s.s7 < minSold || s.s7p < minSold) return null;
  return (s.a7 - s.p7) / s.p7;
}

/** Cuánto más barato está el precio mínimo publicado respecto de la referencia (0.3 = 30 % abajo). */
export function discount(s: ItemSummary): number | null {
  const ref = referencePrice(s);
  if (ref === null || ref <= 0 || s.cp <= 0 || s.oo <= 0) return null;
  return (ref - s.cp) / ref;
}
