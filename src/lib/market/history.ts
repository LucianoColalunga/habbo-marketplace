import type { MarketStats } from "@/lib/habbo/api";
import type { HotelCode } from "@/lib/hotels";

/**
 * Historial propio que guarda el recolector. Habbo solo devuelve los últimos
 * 30 días; acá se van acumulando para poder mirar más atrás, y además se guarda
 * cómo fue cambiando el precio mínimo publicado y las ofertas abiertas (dato que
 * la API no conserva).
 */

/** [fecha AAAAMMDD, promedio, vendidos, ofertas abiertas ese día] */
export type DayPoint = [number, number, number, number];
/** [minutos desde 1970 (UTC), precio mínimo, ofertas abiertas] */
export type SnapPoint = [number, number, number];

export interface MarketHistory {
  v: 1;
  hotel: HotelCode;
  updatedAt: string;
  days: Record<string, DayPoint[]>;
  snaps: Record<string, SnapPoint[]>;
}

export const DAY_RETENTION = 400;
export const SNAP_RETENTION = 240;
/** Aunque el valor no cambie, se guarda un punto nuevo si el último tiene más de esto. */
const SNAP_REFRESH_MINUTES = 20 * 60;

export function emptyHistory(hotel: HotelCode): MarketHistory {
  return { v: 1, hotel, updatedAt: new Date(0).toISOString(), days: {}, snaps: {} };
}

export function parseIsoDate(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function toDateNum(ms: number): number {
  const d = new Date(ms);
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

export function dateNumToMs(n: number): number {
  return Date.UTC(Math.floor(n / 10000), (Math.floor(n / 100) % 100) - 1, n % 100);
}

export function dateNumToIso(n: number): string {
  return new Date(dateNumToMs(n)).toISOString().slice(0, 10);
}

const DAY_MS = 86_400_000;

/** Convierte el historial de la API (offsets) a puntos con fecha absoluta. */
export function dayPointsFromStats(stats: MarketStats): DayPoint[] {
  const base = parseIsoDate(stats.statsDate);
  if (base === null) return [];
  return stats.history
    .filter((h) => h.sold > 0)
    .map((h): DayPoint => [toDateNum(base + h.offset * DAY_MS), h.avg, h.sold, h.offers]);
}

function mergeDays(existing: DayPoint[] | undefined, incoming: DayPoint[], minDate: number): DayPoint[] {
  const byDate = new Map<number, DayPoint>();
  for (const p of existing ?? []) byDate.set(p[0], p);
  for (const p of incoming) byDate.set(p[0], p); // el dato más nuevo de Habbo gana
  return [...byDate.values()].filter((p) => p[0] >= minDate).sort((a, b) => a[0] - b[0]);
}

function mergeSnap(existing: SnapPoint[] | undefined, point: SnapPoint): SnapPoint[] | undefined {
  const list = existing ? [...existing] : [];
  const last = list[list.length - 1];
  const [, cp, oo] = point;
  if (!last) {
    if (cp === 0 && oo === 0) return existing; // nunca tuvo ofertas: no hace falta guardar nada
    list.push(point);
  } else {
    if (point[0] <= last[0]) return list;
    const changed = last[1] !== cp || last[2] !== oo;
    if (changed || point[0] - last[0] >= SNAP_REFRESH_MINUTES) list.push(point);
  }
  return list.length > SNAP_RETENTION ? list.slice(list.length - SNAP_RETENTION) : list;
}

export function mergeHistory(previous: MarketHistory, scanned: MarketStats[], now: Date): MarketHistory {
  const days: Record<string, DayPoint[]> = { ...previous.days };
  const snaps: Record<string, SnapPoint[]> = { ...previous.snaps };
  const minute = Math.floor(now.getTime() / 60000);
  let latestBase: number | null = null;
  for (const s of scanned) {
    const base = parseIsoDate(s.statsDate);
    if (base !== null && (latestBase === null || base > latestBase)) latestBase = base;
  }
  const minDate = toDateNum((latestBase ?? now.getTime()) - DAY_RETENTION * DAY_MS);

  for (const s of scanned) {
    const incoming = dayPointsFromStats(s);
    if (incoming.length > 0 || days[s.item]) {
      const merged = mergeDays(days[s.item], incoming, minDate);
      if (merged.length > 0) days[s.item] = merged;
      else delete days[s.item];
    }
    const snap = mergeSnap(snaps[s.item], [minute, s.currentPrice, s.currentOpenOffers]);
    if (snap && snap.length > 0) snaps[s.item] = snap;
  }
  return { v: 1, hotel: previous.hotel, updatedAt: now.toISOString(), days, snaps };
}
