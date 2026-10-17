import type { HotelCode } from "@/lib/hotels";
import type { ItemSummary } from "./stats";

/**
 * "Ofertas detectadas": furnis cuyo precio mínimo publicado está bastante por
 * debajo de lo que se viene pagando ESTA semana.
 *
 * Reglas (ajustadas con datos reales del 17/10/2026, donde un promedio de 30 días
 * inflado por ventas viejas generaba falsas ofertas):
 * - tiene que haber ventas recientes (2 o más en 7 días y 5 o más en 30), y la
 *   referencia es el promedio de 7 días (si hubo pocas ventas, el menor entre 7 y 30);
 * - si hay más ofertas abiertas que ventas en 30 días, el mercado está saturado:
 *   el precio bajo no es una ganga, es que nadie compra;
 * - se ignoran furnis de menos de 10 créditos.
 */
export interface DealOptions {
  /** 0.25 = 25 % por debajo de la referencia. */
  minDiscount?: number;
  minSold7?: number;
  minSold30?: number;
  minRef?: number;
}

export interface Deal {
  hotel: HotelCode;
  k: string;
  cp: number;
  oo: number;
  ref: number;
  /** 0.3 = 30 % por debajo. */
  pct: number;
  /** Ahorro en créditos respecto de la referencia. */
  saving: number;
  s30: number;
}

export const DEFAULT_DEAL_OPTIONS: Required<DealOptions> = { minDiscount: 0.25, minSold7: 2, minSold30: 5, minRef: 10 };

/** Precio de referencia para detectar ofertas: lo que se pagó en la última semana. */
export function dealReference(s: Pick<ItemSummary, "a7" | "s7" | "a30">): number | null {
  if (s.a7 === null) return null;
  return s.s7 >= 3 || s.a30 === null ? s.a7 : Math.min(s.a7, s.a30);
}

export function dealFor(hotel: HotelCode, k: string, s: ItemSummary, options: DealOptions = {}): Deal | null {
  const o = { ...DEFAULT_DEAL_OPTIONS, ...options };
  if (s.cp <= 0 || s.oo <= 0 || s.s7 < o.minSold7 || s.s30 < o.minSold30) return null;
  if (s.oo > Math.max(5, s.s30)) return null; // saturado
  const ref = dealReference(s);
  if (ref === null || ref < o.minRef) return null;
  const pct = (ref - s.cp) / ref;
  if (pct < o.minDiscount) return null;
  return { hotel, k, cp: s.cp, oo: s.oo, ref, pct, saving: ref - s.cp, s30: s.s30 };
}

export function findDeals(
  hotel: HotelCode,
  items: Record<string, ItemSummary>,
  options: DealOptions = {},
  sort: "pct" | "saving" = "pct",
): Deal[] {
  const deals: Deal[] = [];
  for (const [k, s] of Object.entries(items)) {
    const d = dealFor(hotel, k, s, options);
    if (d) deals.push(d);
  }
  return deals.sort((a, b) => (sort === "pct" ? b.pct - a.pct || b.saving - a.saving : b.saving - a.saving || b.pct - a.pct));
}
