import { DEFAULT_INTERVAL_MS, fetchMany, MAX_ITEMS_PER_TYPE, type ItemRef, type MarketStats } from "@/lib/habbo/api";
import { CATALOG_SCHEMA, fetchCatalog, fetchFurnidataHash, type Catalog } from "@/lib/habbo/furnidata";
import type { HotelCode } from "@/lib/hotels";
import { getStorage, keys, type Storage } from "@/lib/storage";
import { emptyHistory, mergeHistory, type MarketHistory } from "./history";
import { summarize, type ItemSummary } from "./stats";
import type { Coverage, MarketSummary } from "./summary";

/**
 * Escaneo "rotativo": cada corrida consulta una parte del catálogo, eligiendo
 * primero lo que más importa (furnis vigilados, nunca escaneados, y los más
 * activos que hace más tiempo que no se actualizan). Así entra en el límite de
 * 5 minutos de una función de Vercel y respeta los ~20 pedidos por minuto de la
 * API. En modo completo (local) recorre todo el catálogo de una vez.
 */

export interface ScanOptions {
  storage?: Storage;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  /** Ignora el intervalo mínimo entre corridas. */
  force?: boolean;
  /** Recorre todo el catálogo sin límite de tiempo (para correr en una PC). */
  full?: boolean;
  /**
   * Cada cuántos minutos se guarda el historial como mucho (por defecto 480 = 8 h).
   * Cada escritura cuenta en el plan gratis de Vercel Blob (2.000 por mes).
   */
  historyEveryMinutes?: number;
  /** Tiempo máximo para consultar la API en esta corrida (ms). */
  timeBudgetMs?: number;
  /** Separación entre pedidos (ms). */
  intervalMs?: number;
  /** No se corre si la corrida anterior fue hace menos de estos minutos. */
  minIntervalMinutes?: number;
  /** Furnis que siempre se incluyen (por ejemplo, los de las alertas del servidor). */
  priorityItems?: string[];
  now?: () => Date;
  log?: (message: string) => void;
}

/** Cada cuántos minutos se guarda el historial como mucho, si no se indica otra cosa (8 h). */
export const HISTORY_EVERY_MINUTES = 480;

export type ScanOutcome =
  | { status: "skipped"; hotel: HotelCode; reason: string; lastScan: string }
  | { status: "done"; hotel: HotelCode; summary: MarketSummary };

function envNumber(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function mostCommon(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = "";
  let max = 0;
  for (const [v, c] of counts) if (c > max) [best, max] = [v, c];
  return best;
}

/** Prioridad de un furni para la próxima corrida (más alto = antes). */
export function scanPriority(prev: ItemSummary | undefined, nowMin: number, index: number, watched: boolean): number {
  if (watched) return 1e15 - index;
  if (!prev) return 1e12 - index; // nunca escaneado: en el orden del catálogo
  const ageMin = Math.max(nowMin - prev.at, 0);
  const weight = 1 + Math.log2(1 + prev.s30) + (prev.oo > 0 ? 1 : 0);
  return ageMin * weight;
}

/** Elige qué furnis consultar en esta corrida (como mucho maxBatches pedidos). */
export function pickItems(
  catalog: Catalog,
  previous: MarketSummary | null,
  nowMin: number,
  maxBatches: number,
  priority: Set<string> = new Set(),
): ItemRef[] {
  const prev = previous?.items ?? {};
  const ranked = catalog.items.map((item, index) => ({
    item,
    score: scanPriority(prev[item.k], nowMin, index, priority.has(item.k)),
  }));
  ranked.sort((a, b) => b.score - a.score);
  const limit = Number.isFinite(maxBatches) ? maxBatches * MAX_ITEMS_PER_TYPE : Number.POSITIVE_INFINITY;
  const room: ItemRef[] = [];
  const wall: ItemRef[] = [];
  for (const { item } of ranked) {
    const list = item.t === "w" ? wall : room;
    if (list.length < limit) list.push({ name: item.k, type: item.t });
  }
  return [...room, ...wall];
}

export function coverageOf(items: Record<string, ItemSummary>, catalogSize: number, nowMin: number): Coverage {
  let last24h = 0;
  let last72h = 0;
  const values = Object.values(items);
  for (const s of values) {
    const age = nowMin - s.at;
    if (age <= 24 * 60) last24h++;
    if (age <= 72 * 60) last72h++;
  }
  return { catalog: catalogSize, ever: values.length, last24h, last72h };
}

export async function ensureCatalog(
  hotel: HotelCode,
  storage: Storage,
  fetchImpl: typeof fetch,
  log: (m: string) => void,
): Promise<{ catalog: Catalog; refreshed: boolean }> {
  const stored = await storage.read<Catalog>(keys.catalog(hotel));
  let hash: string;
  try {
    hash = await fetchFurnidataHash(hotel, fetchImpl);
  } catch (error) {
    if (stored) {
      log(`No se pudo leer el hash del furnidata (${(error as Error).message}); uso el catálogo guardado.`);
      return { catalog: stored.data, refreshed: false };
    }
    throw error;
  }
  // Se vuelve a descargar si Habbo lo cambió o si el guardado tiene un formato viejo.
  if (stored && stored.data.hash === hash && stored.data.schema === CATALOG_SCHEMA) return { catalog: stored.data, refreshed: false };
  log(`Descargando furnidata de ${hotel} (hash ${hash.slice(0, 8)})…`);
  const catalog = await fetchCatalog(hotel, hash, fetchImpl);
  await storage.write(keys.catalog(hotel), catalog);
  log(`Catálogo guardado: ${catalog.items.length} furnis intercambiables.`);
  return { catalog, refreshed: true };
}

export async function runScan(hotel: HotelCode, options: ScanOptions = {}): Promise<ScanOutcome> {
  const storage = options.storage ?? (await getStorage());
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => new Date());
  const log = options.log ?? (() => {});
  const started = now();

  const previous = (await storage.read<MarketSummary>(keys.summary(hotel)))?.data ?? null;
  const minInterval = options.minIntervalMinutes ?? envNumber("SCAN_MIN_INTERVAL_MINUTES", 10);
  if (previous && !options.force) {
    const ageMin = (started.getTime() - Date.parse(previous.generatedAt)) / 60000;
    if (ageMin < minInterval) {
      return {
        status: "skipped",
        hotel,
        reason: `La corrida anterior fue hace ${Math.round(ageMin)} min (mínimo ${minInterval} min).`,
        lastScan: previous.generatedAt,
      };
    }
  }

  const { catalog, refreshed } = await ensureCatalog(hotel, storage, fetchImpl, log);
  const intervalMs = options.intervalMs ?? envNumber("SCAN_INTERVAL_MS", DEFAULT_INTERVAL_MS);
  const budget = options.full ? Number.POSITIVE_INFINITY : (options.timeBudgetMs ?? envNumber("SCAN_TIME_BUDGET_MS", 240_000));
  const maxBatches = options.full ? Number.POSITIVE_INFINITY : Math.max(1, Math.ceil(budget / intervalMs));
  const nowMin = Math.floor(started.getTime() / 60000);
  const items = pickItems(catalog, previous, nowMin, maxBatches, new Set(options.priorityItems ?? []));
  const roomCount = items.filter((i) => i.type === "r").length;
  log(
    `Corrida de ${hotel}: ${items.length} furnis (${roomCount} de suelo, ${items.length - roomCount} de pared), ` +
      `1 pedido cada ${intervalMs / 1000} s${options.full ? ", catálogo completo" : ""}…`,
  );

  let lastLogged = 0;
  const result = await fetchMany(hotel, items, {
    fetchImpl,
    sleep: options.sleep,
    intervalMs,
    deadline: Number.isFinite(budget) ? started.getTime() + budget : undefined,
    now: () => now().getTime(),
    onProgress: ({ done, total }) => {
      if (done - lastLogged >= 25 || done === total) {
        lastLogged = done;
        log(`  ${done}/${total} pedidos`);
      }
    },
    onRateLimited: () => log("  la API pidió bajar el ritmo (429); espero y sigo más despacio"),
  });

  if (result.results.length === 0) {
    throw new Error(`La corrida de ${hotel} no devolvió datos (${result.errors[0] ?? "sin detalle"}).`);
  }

  const finished = now();
  const scanMin = Math.floor(finished.getTime() / 60000);
  const inCatalog = new Set(catalog.items.map((i) => i.k));
  const merged: Record<string, ItemSummary> = {};
  for (const [k, s] of Object.entries(previous?.items ?? {})) if (inCatalog.has(k)) merged[k] = s;
  for (const stats of result.results) merged[stats.item] = summarize(stats, scanMin);

  const summary: MarketSummary = {
    v: 1,
    hotel,
    generatedAt: finished.toISOString(),
    statsDate: mostCommon(result.results.map((r) => r.statsDate)) || previous?.statsDate || "",
    scan: {
      startedAt: started.toISOString(),
      durationMs: finished.getTime() - started.getTime(),
      requests: result.requests,
      selected: items.length,
      scanned: result.results.length,
      failedBatches: result.failedBatches,
      rateLimited: result.rateLimited,
      truncated: result.truncated,
      errors: result.errors,
      catalogRefreshed: refreshed,
    },
    coverage: coverageOf(merged, catalog.items.length, scanMin),
    items: merged,
  };

  const historyEvery = options.full ? 0 : (options.historyEveryMinutes ?? envNumber("SCAN_HISTORY_EVERY_MINUTES", HISTORY_EVERY_MINUTES));
  const lastHistory = previous?.historyAt ? Date.parse(previous.historyAt) : 0;
  if ((finished.getTime() - lastHistory) / 60000 >= historyEvery) {
    await saveHistory(hotel, storage, result.results, finished, merged);
    summary.historyAt = finished.toISOString();
  } else if (previous?.historyAt) {
    summary.historyAt = previous.historyAt;
  }
  await storage.write(keys.summary(hotel), summary);
  log(
    `Listo: ${summary.scan.scanned} furnis en ${result.requests} pedidos, ${Math.round(summary.scan.durationMs / 1000)} s` +
      (result.rateLimited ? `, ${result.rateLimited} avisos 429` : "") +
      (result.failedBatches ? `, ${result.failedBatches} lotes con error` : "") +
      `. Cobertura: ${summary.coverage.last24h}/${summary.coverage.catalog} en 24 h.`,
  );
  return { status: "done", hotel, summary };
}

async function saveHistory(hotel: HotelCode, storage: Storage, scanned: MarketStats[], at: Date, latest: Record<string, ItemSummary>) {
  const previous = (await storage.read<MarketHistory>(keys.history(hotel)))?.data ?? emptyHistory(hotel);
  await storage.write(keys.history(hotel), mergeHistory(previous, scanned, at, latest));
}
