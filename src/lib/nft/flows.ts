import type { NftCollectionDay } from "./model";

/** Fecha AAAAMMDD → milisegundos (medianoche UTC). */
export const dayMs = (date: number) => Date.UTC(Math.floor(date / 10000), (Math.floor(date / 100) % 100) - 1, date % 100);

/** Vendidas, acuñadas y quemadas de los últimos `n` días completos (`full`: si hay datos de los `n`). */
export function lastDaysTotals(days: NftCollectionDay[], n = 7) {
  const recent = days.slice(-n);
  return {
    full: recent.length === n,
    count: recent.length,
    sold: recent.reduce((s, d) => s + d[1], 0),
    minted: recent.reduce((s, d) => s + d[2], 0),
    burned: recent.reduce((s, d) => s + d[3], 0),
  };
}
