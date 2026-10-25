import { toDateNum, type MarketHistory } from "./history";
import type { ItemSummary } from "./stats";

/**
 * Movimiento de un grupo de furnis (una categoría o todo el hotel) por día:
 * vendidas y créditos (del historial diario de Habbo) y publicaciones abiertas
 * al cerrar el día (lo que fue midiendo este sitio en cada escaneo).
 *
 * Habbo da las ventas de un día recién cuando el día terminó, y cada furni se
 * vuelve a consultar cada tantas horas: un día se muestra solo cuando los furnis
 * que se actualizaron después de que terminó suman casi todas las ventas del
 * grupo (si no, ese día saldría con menos ventas de las reales).
 */

/** [fecha AAAAMMDD, vendidas, créditos movidos, publicaciones abiertas al cerrar el día (null: sin medir)] */
export type MarketFlowDay = [number, number, number, number | null];

export interface MarketFlow {
  days: MarketFlowDay[];
  /** Publicaciones abiertas ahora (último dato de cada furni) y cuántos furnis tienen alguna. */
  offersNow: number;
  itemsWithOffers: number;
}

const DAY_MS = 86_400_000;
/**
 * Parte de las ventas del grupo (pesadas por sus ventas en 30 días) que tiene
 * que estar al día. Los furnis sin ventas no pesan: no cambian los totales.
 */
export const MIN_COVERAGE = 0.9;

const dateMs = (date: number) => Date.UTC(Math.floor(date / 10000), (Math.floor(date / 100) % 100) - 1, date % 100);

export function marketFlow(
  keys: string[],
  history: Pick<MarketHistory, "days" | "snaps" | "seen"> | null,
  items: Record<string, Pick<ItemSummary, "oo" | "s30">>,
  now: number,
  span = 30,
): MarketFlow {
  const today = toDateNum(now);
  const dates: number[] = [];
  for (let i = span; i >= 1; i--) dates.push(toDateNum(now - i * DAY_MS));
  const index = new Map(dates.map((d, i) => [d, i]));
  const endMin = dates.map((d) => Math.floor((dateMs(d) + DAY_MS) / 60000));
  const sold = dates.map(() => 0);
  const credits = dates.map(() => 0);
  const covered = dates.map(() => 0);
  const offers = dates.map(() => 0);
  const offersKnown = dates.map(() => false);
  let totalWeight = 0;
  let offersNow = 0;
  let itemsWithOffers = 0;

  for (const k of keys) {
    const s = items[k];
    if (s && s.oo > 0) {
      offersNow += s.oo;
      itemsWithOffers++;
    }
    const weight = s?.s30 ?? 0;
    totalWeight += weight;
    const seen = history?.seen?.[k] ?? 0;
    for (let i = 0; i < dates.length; i++) if (seen >= endMin[i]) covered[i] += weight;
    for (const p of history?.days[k] ?? []) {
      const i = index.get(p[0]);
      if (i === undefined) continue;
      sold[i] += p[2];
      credits[i] += p[1] * p[2];
    }
    // Publicaciones al cerrar cada día: la última medición anterior a ese momento.
    const snaps = history?.snaps[k];
    if (snaps && snaps.length > 0) {
      let j = 0;
      for (let i = 0; i < dates.length; i++) {
        while (j < snaps.length && snaps[j][0] < endMin[i]) j++;
        if (j > 0) {
          offers[i] += snaps[j - 1][2];
          offersKnown[i] = true;
        }
      }
    }
  }

  const days: MarketFlowDay[] = [];
  for (let i = 0; i < dates.length; i++) {
    if (dates[i] >= today) continue;
    // Sin ventas en 30 días en todo el grupo: los días son ceros, y eso es cierto.
    if (totalWeight > 0 && covered[i] / totalWeight < MIN_COVERAGE) continue;
    days.push([dates[i], sold[i], Math.round(credits[i]), offersKnown[i] ? offers[i] : null]);
  }
  return { days, offersNow, itemsWithOffers };
}

/** Totales de los últimos `n` días que se pudieron mostrar. */
export function flowTotals(days: MarketFlowDay[], n = 7) {
  const recent = days.slice(-n);
  return { count: recent.length, sold: recent.reduce((s, d) => s + d[1], 0), credits: recent.reduce((s, d) => s + d[2], 0) };
}
