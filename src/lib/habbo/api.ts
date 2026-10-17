import { hotelBaseUrl, type HotelCode } from "@/lib/hotels";

/**
 * Cliente del endpoint público y documentado de Habbo:
 *   POST https://www.habbo.<tld>/api/public/marketplace/stats/batch
 * Documentación oficial (Swagger): https://www.habbo.com/api/public/api-docs/
 *
 * Límites verificados:
 * - como máximo 25 furnis de suelo y 25 de pared por pedido (con más, responde
 *   400 "Too many items in the request");
 * - unos 15-20 pedidos por minuto por IP; al pasarse responde 429 sin Retry-After.
 * Los furnis que no existen o no tienen datos simplemente no vienen en la respuesta.
 */

export const MAX_ITEMS_PER_TYPE = 25;

export const USER_AGENT =
  process.env.HABBO_API_USER_AGENT ||
  "habbo-marketplace/1.0 (+https://github.com/LucianoColalunga/habbo-marketplace)";

export type FurniType = "r" | "w"; // r = suelo (roomItem), w = pared (wallItem)

export interface ItemRef {
  name: string;
  type: FurniType;
}

interface RawHistoryEntry {
  dayOffset?: string | number;
  averagePrice?: string | number;
  totalSoldItems?: string | number;
  totalCreditSum?: string | number;
  totalOpenOffers?: string | number;
}

interface RawItemData {
  item?: string;
  statsDate?: string;
  history?: RawHistoryEntry[];
  averagePrice?: number;
  currentOpenOffers?: number;
  currentPrice?: number;
  historyLimitInDays?: number;
}

interface RawBatchResponse {
  status?: string;
  message?: string;
  roomItemData?: RawItemData[];
  wallItemData?: RawItemData[];
}

/** Un día del historial que devuelve Habbo (solo vienen los días con ventas). */
export interface DayStat {
  /** Días respecto de statsDate: -1 = ayer, -30 = hace 30 días. */
  offset: number;
  avg: number;
  sold: number;
  credits: number;
  offers: number;
}

export interface MarketStats {
  item: string;
  type: FurniType;
  /** Fecha (YYYY-MM-DD) a la que se refieren los offsets del historial. */
  statsDate: string;
  /** Precio más bajo entre las ofertas abiertas en este momento (0 = no hay ofertas). */
  currentPrice: number;
  /** Cantidad de ofertas abiertas en este momento. */
  currentOpenOffers: number;
  /** Precio promedio de venta según Habbo (aprox. últimos 30 días). */
  averagePrice: number;
  historyLimitInDays: number;
  /** Ordenado del día más viejo al más reciente. */
  history: DayStat[];
}

function toInt(value: unknown): number {
  const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

export function normalizeItem(raw: RawItemData, type: FurniType): MarketStats | null {
  if (!raw || typeof raw.item !== "string" || raw.item.length === 0) return null;
  const history: DayStat[] = (Array.isArray(raw.history) ? raw.history : [])
    .map((h) => ({
      offset: toInt(h.dayOffset),
      avg: toInt(h.averagePrice),
      sold: toInt(h.totalSoldItems),
      credits: toInt(h.totalCreditSum),
      offers: toInt(h.totalOpenOffers),
    }))
    .filter((h) => h.offset < 0)
    .sort((a, b) => a.offset - b.offset);
  return {
    item: raw.item,
    type,
    statsDate: typeof raw.statsDate === "string" ? raw.statsDate : "",
    currentPrice: Math.max(0, toInt(raw.currentPrice)),
    currentOpenOffers: Math.max(0, toInt(raw.currentOpenOffers)),
    averagePrice: Math.max(0, toInt(raw.averagePrice)),
    historyLimitInDays: toInt(raw.historyLimitInDays) || 30,
    history,
  };
}

export function parseBatchResponse(body: RawBatchResponse): MarketStats[] {
  if (!body || body.status !== "OK") {
    throw new HabboApiError(`Respuesta inesperada de la API: ${body?.message ?? body?.status ?? "sin estado"}`);
  }
  const out: MarketStats[] = [];
  for (const raw of body.roomItemData ?? []) {
    const item = normalizeItem(raw, "r");
    if (item) out.push(item);
  }
  for (const raw of body.wallItemData ?? []) {
    const item = normalizeItem(raw, "w");
    if (item) out.push(item);
  }
  return out;
}

export class HabboApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "HabboApiError";
  }
}

/** Arma los lotes respetando el máximo de 25 por tipo y mezclando suelo y pared. */
export function makeBatches(items: ItemRef[]): { room: string[]; wall: string[] }[] {
  const room = [...new Set(items.filter((i) => i.type === "r").map((i) => i.name))];
  const wall = [...new Set(items.filter((i) => i.type === "w").map((i) => i.name))];
  const count = Math.max(Math.ceil(room.length / MAX_ITEMS_PER_TYPE), Math.ceil(wall.length / MAX_ITEMS_PER_TYPE));
  const batches: { room: string[]; wall: string[] }[] = [];
  for (let i = 0; i < count; i++) {
    batches.push({
      room: room.slice(i * MAX_ITEMS_PER_TYPE, (i + 1) * MAX_ITEMS_PER_TYPE),
      wall: wall.slice(i * MAX_ITEMS_PER_TYPE, (i + 1) * MAX_ITEMS_PER_TYPE),
    });
  }
  return batches;
}

export interface RequestOptions {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  /** Reintentos ante 429, 5xx o errores de red. */
  retries?: number;
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  /** Momento (ms epoch) después del cual no se espera para reintentar. */
  deadline?: number;
  /** Se llama cuando la API responde 429 (demasiados pedidos). */
  onRateLimited?: () => void;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Espera antes de reintentar. La API no manda Retry-After; medimos que tras un
 * 429 vuelve a responder en unos 15 segundos, así que se espera al menos 20.
 */
export function retryDelay(attempt: number, status: number | null, retryAfter: string | null): number {
  const header = retryAfter ? Number.parseInt(retryAfter, 10) : Number.NaN;
  if (Number.isFinite(header) && header > 0) return Math.min(header, 60) * 1000;
  if (status === 429) return [20000, 30000, 45000][Math.min(attempt, 2)];
  return [1000, 3000, 8000][Math.min(attempt, 2)];
}

/** Un pedido a la API (hasta 25 + 25 furnis), con reintentos y espera progresiva. */
export async function fetchBatch(
  hotel: HotelCode,
  batch: { room: string[]; wall: string[] },
  options: RequestOptions = {},
): Promise<MarketStats[]> {
  if (batch.room.length > MAX_ITEMS_PER_TYPE || batch.wall.length > MAX_ITEMS_PER_TYPE) {
    throw new HabboApiError(`Máximo ${MAX_ITEMS_PER_TYPE} furnis por tipo en cada pedido`);
  }
  if (batch.room.length === 0 && batch.wall.length === 0) return [];
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? Date.now;
  const retries = options.retries ?? 3;
  const url = `${hotelBaseUrl(hotel)}/api/public/marketplace/stats/batch`;
  const body = JSON.stringify({
    roomItems: batch.room.map((item) => ({ item })),
    wallItems: batch.wall.map((item) => ({ item })),
  });

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const timeout = AbortSignal.timeout(options.timeoutMs ?? 20000);
    const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
    let status: number | null = null;
    let retryAfter: string | null = null;
    try {
      const res = await fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": USER_AGENT },
        body,
        signal,
        cache: "no-store",
      });
      if (res.ok) return parseBatchResponse((await res.json()) as RawBatchResponse);
      status = res.status;
      retryAfter = res.headers.get("retry-after");
      if (status === 429) options.onRateLimited?.();
      const retryable = status === 429 || status >= 500;
      lastError = new HabboApiError(
        status === 429 ? "La API limitó los pedidos (429)" : `La API respondió ${status}`,
        status,
        retryable,
      );
      if (!retryable) throw lastError;
    } catch (error) {
      if (options.signal?.aborted) throw error;
      if (error instanceof HabboApiError && !error.retryable) throw error;
      lastError = error;
    }
    if (attempt === retries) break;
    const delay = retryDelay(attempt, status, retryAfter);
    if (options.deadline && now() + delay > options.deadline) break;
    await sleep(delay);
  }
  throw lastError instanceof Error ? lastError : new HabboApiError("No se pudo consultar la API");
}

export interface ScanProgress {
  done: number;
  total: number;
}

export interface FetchManyOptions extends RequestOptions {
  /** Separación mínima entre pedidos (ms). 5000 = 12 pedidos por minuto. */
  intervalMs?: number;
  /** Momento (ms epoch) a partir del cual no se lanzan pedidos nuevos. */
  deadline?: number;
  onProgress?: (progress: ScanProgress) => void;
}

export interface FetchManyResult {
  results: MarketStats[];
  requests: number;
  failedBatches: number;
  rateLimited: number;
  /** true si se cortó por tiempo y quedaron lotes sin consultar. */
  truncated: boolean;
  errors: string[];
}

/**
 * Ritmo por defecto: 1 pedido cada 5 s (12 por minuto). Medido el 17/10/2026:
 * ráfagas de ~15-20 pedidos seguidos reciben 429 (sin Retry-After) y la API
 * vuelve a responder a los ~15 s; a 15 por minuto sostenidos todavía aparecieron
 * algunos 429, así que se deja margen.
 */
export const DEFAULT_INTERVAL_MS = 5000;
const MAX_INTERVAL_MS = 8000;

/**
 * Consulta muchos furnis de a un pedido por vez, espaciados para respetar el
 * límite de la API. Si aparece un 429, baja el ritmo para el resto del escaneo.
 */
export async function fetchMany(hotel: HotelCode, items: ItemRef[], options: FetchManyOptions = {}): Promise<FetchManyResult> {
  const batches = makeBatches(items);
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;
  let interval = Math.max(options.intervalMs ?? DEFAULT_INTERVAL_MS, 500);
  const results: MarketStats[] = [];
  const errors: string[] = [];
  let requests = 0;
  let failedBatches = 0;
  let rateLimited = 0;
  let truncated = false;
  let nextStart = 0;

  for (let i = 0; i < batches.length; i++) {
    if (options.signal?.aborted) {
      truncated = true;
      break;
    }
    const wait = nextStart - now();
    if (options.deadline && now() + Math.max(wait, 0) >= options.deadline) {
      truncated = true;
      break;
    }
    if (wait > 0) await sleep(wait);
    nextStart = now() + interval;
    requests++;
    try {
      results.push(
        ...(await fetchBatch(hotel, batches[i], {
          ...options,
          onRateLimited: () => {
            rateLimited++;
            interval = Math.min(Math.round(interval * 1.5), MAX_INTERVAL_MS);
            options.onRateLimited?.();
          },
        })),
      );
    } catch (error) {
      failedBatches++;
      if (errors.length < 10) errors.push(error instanceof Error ? error.message : String(error));
    }
    options.onProgress?.({ done: i + 1, total: batches.length });
  }
  return { results, requests, failedBatches, rateLimited, truncated, errors };
}
