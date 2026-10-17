import { hotelBaseUrl, type HotelCode } from "@/lib/hotels";
import { makeBatches, parseBatchResponse, type ItemRef, type MarketStats } from "./api";

/**
 * Consulta en vivo desde el navegador del visitante, directo a la API pública
 * de Habbo (la API permite pedidos desde otros sitios vía CORS). Así cada
 * visitante usa su propio cupo de pedidos y el servidor no hace de intermediario.
 *
 * Para no pasarse del límite (~20 por minuto por IP, y cada pedido del navegador
 * suma una consulta previa OPTIONS), se limita a 6 pedidos por minuto entre todas
 * las pestañas abiertas del sitio, y se reutiliza cada respuesta durante 60 s.
 */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 6;
const CACHE_MS = 60_000;
const STAMPS_KEY = "fm:live-stamps";

const cache = new Map<string, { at: number; stats: MarketStats | null }>();

export class LiveLimitError extends Error {
  constructor(readonly retryInMs: number) {
    super("Se alcanzó el límite de consultas en vivo; esperá unos segundos.");
    this.name = "LiveLimitError";
  }
}

function readStamps(now: number): number[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STAMPS_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((t) => typeof t === "number" && now - t < WINDOW_MS) : [];
  } catch {
    return [];
  }
}

function takeSlot(now: number): number {
  const stamps = readStamps(now);
  if (stamps.length >= MAX_PER_WINDOW) return Math.min(...stamps) + WINDOW_MS - now;
  stamps.push(now);
  try {
    localStorage.setItem(STAMPS_KEY, JSON.stringify(stamps));
  } catch {
    // Sin almacenamiento: el límite queda solo en memoria de esta pestaña.
  }
  return 0;
}

const memoryStamps: number[] = [];
function takeSlotSafe(now: number): number {
  if (typeof localStorage !== "undefined") return takeSlot(now);
  while (memoryStamps.length && now - memoryStamps[0] >= WINDOW_MS) memoryStamps.shift();
  if (memoryStamps.length >= MAX_PER_WINDOW) return memoryStamps[0] + WINDOW_MS - now;
  memoryStamps.push(now);
  return 0;
}

export interface LiveResult {
  stats: Map<string, MarketStats>;
  fetchedAt: number;
  /** Furnis que no se pudieron consultar por el límite de pedidos. */
  skipped: string[];
}

/** Consulta varios furnis (en lotes de hasta 25 + 25). Devuelve lo que pudo. */
export async function fetchLive(hotel: HotelCode, items: ItemRef[], { force = false } = {}): Promise<LiveResult> {
  const now = Date.now();
  const out = new Map<string, MarketStats>();
  const pending: ItemRef[] = [];
  for (const item of items) {
    const hit = cache.get(`${hotel}:${item.name}`);
    if (!force && hit && now - hit.at < CACHE_MS) {
      if (hit.stats) out.set(item.name, hit.stats);
    } else {
      pending.push(item);
    }
  }
  const skipped: string[] = [];
  for (const batch of makeBatches(pending)) {
    const wait = takeSlotSafe(Date.now());
    if (wait > 0) {
      skipped.push(...batch.room, ...batch.wall);
      continue;
    }
    const res = await fetch(`${hotelBaseUrl(hotel)}/api/public/marketplace/stats/batch`, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomItems: batch.room.map((item) => ({ item })),
        wallItems: batch.wall.map((item) => ({ item })),
      }),
    });
    if (res.status === 429) throw new LiveLimitError(20_000);
    if (!res.ok) throw new Error(`La API de Habbo respondió ${res.status}`);
    const parsed = parseBatchResponse(await res.json());
    const at = Date.now();
    const got = new Set<string>();
    for (const stats of parsed) {
      out.set(stats.item, stats);
      cache.set(`${hotel}:${stats.item}`, { at, stats });
      got.add(stats.item);
    }
    for (const name of [...batch.room, ...batch.wall]) {
      if (!got.has(name)) cache.set(`${hotel}:${name}`, { at, stats: null });
    }
  }
  if (skipped.length > 0 && out.size === 0) {
    throw new LiveLimitError(WINDOW_MS);
  }
  return { stats: out, fetchedAt: Date.now(), skipped };
}
