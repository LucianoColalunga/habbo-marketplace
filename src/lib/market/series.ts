import type { MarketStats } from "@/lib/habbo/api";
import { dateNumToMs, dayPointsFromStats, type DayPoint, type SnapPoint } from "./history";

export interface DayRow {
  /** Medianoche UTC del día (ms). */
  x: number;
  avg: number;
  sold: number;
  offers: number;
}

/** Une el historial guardado con el que devolvió la API en vivo (gana el dato en vivo). */
export function mergeDayRows(stored: DayPoint[], live: MarketStats | null): DayRow[] {
  const byDate = new Map<number, DayPoint>();
  for (const p of stored) byDate.set(p[0], p);
  if (live) for (const p of dayPointsFromStats(live)) byDate.set(p[0], p);
  return [...byDate.values()]
    .sort((a, b) => a[0] - b[0])
    .map(([date, avg, sold, offers]) => ({ x: dateNumToMs(date), avg, sold, offers }));
}

/** Últimos N días contados desde `endMs` (incluido). */
export function lastDays<T extends { x: number }>(rows: T[], days: number, endMs: number): T[] {
  if (!Number.isFinite(days)) return rows;
  const from = endMs - (days - 1) * 86_400_000;
  return rows.filter((r) => r.x >= from);
}

export interface SnapRow {
  x: number;
  cp: number;
  oo: number;
}

/** Precio mínimo publicado a lo largo del tiempo (solo los momentos con ofertas). */
export function snapRows(stored: SnapPoint[], live: { at: number; cp: number; oo: number } | null): SnapRow[] {
  const rows = stored.map(([min, cp, oo]) => ({ x: min * 60_000, cp, oo }));
  if (live && (rows.length === 0 || live.at > rows[rows.length - 1].x)) rows.push({ x: live.at, cp: live.cp, oo: live.oo });
  return rows;
}
