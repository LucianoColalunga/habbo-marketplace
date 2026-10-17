import type { NftStack, Rates } from "./api";

/** Fila de un modelo de NFT tal como la usan las páginas. */
export interface NftRow extends Omit<NftStack, "id"> {
  id: string;
  /** Minuto (desde 1970, UTC) en que se tomaron los datos de mercado. */
  at: number;
  /** Ventas: últimos 7 días, los 7 anteriores y 30 días. */
  s7: number;
  s7p: number;
  s30: number;
  /** Volumen en USD de los últimos 7 días. */
  v7: number;
  /** Precio promedio de venta en USD: 7 días, 7 anteriores y 30 días. */
  a7: number | null;
  p7: number | null;
  a30: number | null;
  /** Promedio diario de venta de los últimos 30 días (índice 0 = hace 29 días). */
  sp: (number | null)[];
}

export interface NftScanReport {
  startedAt: string;
  durationMs: number;
  requests: number;
  listedStacks: number;
  newSales: number;
  lookups: number;
  complete: boolean;
  errors: string[];
}

export interface NftSummary {
  v: 1;
  generatedAt: string;
  rates: Rates;
  scan: NftScanReport;
  stacks: Record<string, NftRow>;
}

/** [fecha AAAAMMDD, ventas, USD vendidos] */
export type NftDayPoint = [number, number, number];
/** [minuto, piso USD, mejor oferta USD (0 = ninguna)] */
export type NftSnapPoint = [number, number, number];

export interface NftStackMeta {
  c: string;
  n: string;
  img: string;
  rarity: string;
  type: string;
}

export interface NftHistory {
  v: 1;
  updatedAt: string;
  /** Venta más nueva ya procesada de cada colección (ISO). */
  lastSaleAt: Record<string, string>;
  days: Record<string, NftDayPoint[]>;
  snaps: Record<string, NftSnapPoint[]>;
  /** Caché "contrato:token" -> modelo, para no volver a consultarlo. */
  tokens: Record<string, string>;
  /** Datos básicos de modelos que se vendieron aunque hoy no tengan publicaciones. */
  meta: Record<string, NftStackMeta>;
}

export function emptyNftHistory(): NftHistory {
  return { v: 1, updatedAt: new Date(0).toISOString(), lastSaleAt: {}, days: {}, snaps: {}, tokens: {}, meta: {} };
}
