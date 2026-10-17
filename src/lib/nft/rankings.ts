import type { NftRow } from "./model";

export const NFT_RANKINGS = {
  vendidos: { title: "Más vendidos", hint: "Unidades vendidas en los últimos 7 días." },
  volumen: { title: "Más dólares movidos", hint: "Total pagado en ventas en los últimos 7 días (USD)." },
  subas: { title: "Mayores subas", hint: "Precio promedio de venta de 7 días contra los 7 anteriores (mínimo 3 ventas en cada semana)." },
  bajas: { title: "Mayores bajas", hint: "Precio promedio de venta de 7 días contra los 7 anteriores (mínimo 3 ventas en cada semana)." },
  ofertas: { title: "Ofertas", hint: "Precio piso al menos 30 % por debajo de lo que se pagó en promedio esta semana (con 3 o más ventas)." },
  caros: {
    title: "Más caros",
    hint: "Precio promedio de venta más alto en 30 días (con 2 o más ventas). Se usa la venta real y no el piso, porque hay publicaciones a precios absurdos que nadie compra.",
  },
} as const;

export type NftRankingKind = keyof typeof NFT_RANKINGS;

export function isNftRankingKind(v: unknown): v is NftRankingKind {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(NFT_RANKINGS, v);
}

/** Variación del promedio de venta de 7 días contra los 7 anteriores. */
export function nftWeeklyChange(r: Pick<NftRow, "a7" | "p7" | "s7" | "s7p">, minSales = 3): number | null {
  if (r.a7 === null || r.p7 === null || r.p7 <= 0 || r.s7 < minSales || r.s7p < minSales) return null;
  return (r.a7 - r.p7) / r.p7;
}

/** Cuánto por debajo del promedio semanal está el piso (0.4 = 40 %). */
export function nftDiscount(r: Pick<NftRow, "floorUsd" | "a7" | "s7">, minSales = 3): number | null {
  if (r.floorUsd === null || r.floorUsd < 0.05 || r.a7 === null || r.a7 <= 0 || r.s7 < minSales) return null;
  return (r.a7 - r.floorUsd) / r.a7;
}

export function buildNftRanking(rows: NftRow[], kind: NftRankingKind, limit: number): NftRow[] {
  let list: NftRow[];
  switch (kind) {
    case "vendidos":
      list = rows.filter((r) => r.s7 > 0).sort((a, b) => b.s7 - a.s7 || b.v7 - a.v7);
      break;
    case "volumen":
      list = rows.filter((r) => r.v7 > 0).sort((a, b) => b.v7 - a.v7);
      break;
    case "subas":
    case "bajas": {
      const withChange = rows
        .map((r) => ({ r, c: nftWeeklyChange(r) }))
        .filter((x) => x.c !== null && (kind === "subas" ? x.c > 0 : x.c < 0));
      withChange.sort((a, b) => (kind === "subas" ? b.c! - a.c! : a.c! - b.c!));
      list = withChange.map((x) => x.r);
      break;
    }
    case "ofertas":
      list = rows
        .map((r) => ({ r, d: nftDiscount(r) }))
        .filter((x) => x.d !== null && x.d >= 0.3)
        .sort((a, b) => b.d! - a.d!)
        .map((x) => x.r);
      break;
    case "caros":
      list = rows.filter((r) => r.a30 !== null && r.s30 >= 2).sort((a, b) => b.a30! - a.a30!);
      break;
  }
  return list.slice(0, limit);
}

export interface NftTotals {
  listed: number;
  sales7: number;
  volume7: number;
  models: number;
}

export function nftTotals(rows: NftRow[]): NftTotals {
  let listed = 0;
  let sales7 = 0;
  let volume7 = 0;
  for (const r of rows) {
    if (r.floorUsd !== null) listed++;
    sales7 += r.s7;
    volume7 += r.v7;
  }
  return { listed, sales7, volume7: Math.round(volume7), models: rows.length };
}
