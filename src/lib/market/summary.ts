import type { HotelCode } from "@/lib/hotels";
import type { ItemSummary } from "./stats";

export interface ScanReport {
  startedAt: string;
  durationMs: number;
  requests: number;
  /** Furnis elegidos para esta corrida. */
  selected: number;
  /** Furnis que devolvió la API en esta corrida. */
  scanned: number;
  failedBatches: number;
  /** Veces que la API respondió 429 (demasiados pedidos). */
  rateLimited: number;
  /** true si la corrida se cortó por tiempo. */
  truncated: boolean;
  errors: string[];
  catalogRefreshed: boolean;
}

export interface Coverage {
  /** Furnis intercambiables en el catálogo. */
  catalog: number;
  /** Furnis escaneados al menos una vez. */
  ever: number;
  /** Escaneados en las últimas 24 / 72 horas. */
  last24h: number;
  last72h: number;
}

export interface MarketSummary {
  v: 1;
  hotel: HotelCode;
  /** Momento en que terminó la última corrida (ISO). */
  generatedAt: string;
  /** Última vez que se guardó el historial (ISO); no se guarda en cada corrida. */
  historyAt?: string;
  /** Fecha de las estadísticas según Habbo (AAAA-MM-DD). */
  statsDate: string;
  scan: ScanReport;
  coverage: Coverage;
  /** Último valor conocido de cada furni escaneado (cada uno con su propio momento `at`). */
  items: Record<string, ItemSummary>;
}
