import { PAYMENT_TOKENS } from "./collections";

/**
 * Cliente de la API pública de Immutable zkEVM (sin clave):
 *   https://api.immutable.com/v1/chains/imtbl-zkevm-mainnet/...
 * Límite informado por la propia API: 5 pedidos por segundo por IP
 * (encabezado x-ratelimit-limit: 5;w=1). Usamos como máximo 4.
 */
export const IMX_BASE = "https://api.immutable.com/v1/chains/imtbl-zkevm-mainnet";
export const FIAT_URL = "https://checkout-api.immutable.com/v1/fiat/conversion";

export const NFT_USER_AGENT =
  process.env.HABBO_API_USER_AGENT || "habbo-marketplace/1.0 (+https://github.com/LucianoColalunga/habbo-marketplace)";

/** Un modelo de NFT ("stack"): todas las unidades con la misma metadata. */
export interface NftStack {
  id: string;
  /** Dirección del contrato de la colección. */
  c: string;
  n: string;
  img: string;
  rarity: string;
  type: string;
  subType: string;
  set: string;
  source: string;
  code: string;
  /** Unidades que existen de este modelo. */
  supply: number;
  /** Publicación más barata, en USD (null = no hay ninguna). */
  floorUsd: number | null;
  /** Precio de la más barata en su moneda (por ejemplo 0.00012 ETH). */
  floorNative: { amount: number; symbol: string } | null;
  /** Mejor oferta de compra, en USD. */
  bidUsd: number | null;
  lastUsd: number | null;
  lastAt: string | null;
  /** Publicaciones visibles (la API devuelve hasta 10 por modelo). */
  listed: number;
  /** token_id de la publicación más barata (para el enlace al explorador). */
  floorToken: string | null;
}

export interface NftSale {
  id: string;
  at: string;
  c: string;
  tokenId: string;
  /** Precio pagado (con comisiones) en su moneda. */
  amount: number;
  symbol: string;
  rateId: string;
}

export type Rates = Record<string, number>;

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const BACKOFF = [1000, 3000, 8000, 8000];

export interface ClientOptions {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  /** Separación mínima entre pedidos (ms). 250 = 4 por segundo. */
  intervalMs?: number;
}

/** Cliente con ritmo propio y reintentos ante 429/5xx. */
export class ImmutableClient {
  private next = 0;
  requests = 0;
  constructor(private readonly options: ClientOptions = {}) {}

  async get<T>(url: string): Promise<T> {
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const sleep = this.options.sleep ?? defaultSleep;
    const now = this.options.now ?? Date.now;
    const interval = this.options.intervalMs ?? 250;
    let lastError: unknown;
    for (let attempt = 0; attempt < 4; attempt++) {
      const wait = this.next - now();
      if (wait > 0) await sleep(wait);
      this.next = now() + interval;
      this.requests++;
      let res: Response;
      try {
        res = await fetchImpl(url, {
          headers: { Accept: "application/json", "User-Agent": NFT_USER_AGENT },
          cache: "no-store",
          signal: AbortSignal.timeout(20000),
        });
      } catch (error) {
        lastError = error; // error de red o tiempo agotado: se reintenta
        await sleep(BACKOFF[attempt]);
        continue;
      }
      if (res.ok) return (await res.json()) as T;
      lastError = new Error(`Immutable respondió ${res.status}`);
      if (res.status !== 429 && res.status < 500) throw lastError;
      const reset = Number(res.headers.get("x-ratelimit-reset"));
      await sleep(Number.isFinite(reset) && reset > 0 ? Math.min(reset, 10) * 1000 : BACKOFF[attempt]);
    }
    throw lastError instanceof Error ? lastError : new Error("No se pudo consultar Immutable");
  }
}

interface RawPrice {
  amount?: string;
  fee_inclusive_amount?: string;
  converted_prices?: { USD?: string; ETH?: string; IMX?: string };
  token?: { contract_address?: string; decimals?: number; symbol?: string; type?: string };
}
interface RawListing {
  token_id?: string;
  price_details?: RawPrice;
}
interface RawStackResult {
  stack?: {
    stack_id?: string;
    contract_address?: string;
    name?: string;
    image?: string;
    attributes?: { trait_type?: string; value?: unknown }[];
  };
  stack_count?: number;
  listings?: RawListing[];
  bids?: RawListing[];
  market?: {
    floor_listing?: RawListing | null;
    top_bid?: RawListing | null;
    last_trade?: { created_at?: string; price_details?: RawPrice[] } | null;
  };
}

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number.parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : null;
}

function usdOf(price: RawPrice | undefined | null): number | null {
  return num(price?.converted_prices?.USD);
}

function nativeOf(price: RawPrice | undefined | null): { amount: number; symbol: string } | null {
  if (!price?.fee_inclusive_amount || !price.token) return null;
  const decimals = price.token.decimals ?? 18;
  const amount = Number(price.fee_inclusive_amount) / 10 ** decimals;
  return Number.isFinite(amount) ? { amount, symbol: price.token.symbol ?? "?" } : null;
}

const SAFE_ID = /^[0-9a-f-]{36}$/i;

export function normalizeStack(raw: RawStackResult): NftStack | null {
  const s = raw?.stack;
  if (!s?.stack_id || !SAFE_ID.test(s.stack_id) || !s.contract_address) return null;
  const attrs = new Map((s.attributes ?? []).map((a) => [a.trait_type ?? "", a.value]));
  const text = (k: string) => (typeof attrs.get(k) === "string" ? String(attrs.get(k)).slice(0, 80) : "");
  const floor = raw.market?.floor_listing ?? null;
  const last = raw.market?.last_trade ?? null;
  const topBid = raw.market?.top_bid ?? raw.bids?.[0] ?? null;
  const image = typeof s.image === "string" && s.image.startsWith("https://") ? s.image : "";
  return {
    id: s.stack_id,
    c: s.contract_address.toLowerCase(),
    n: (s.name ?? "Sin nombre").slice(0, 120),
    img: image,
    rarity: text("rarity"),
    type: text("itemType"),
    subType: text("itemSubType"),
    set: text("setId"),
    source: text("source"),
    code: text("productCode") || text("blueprint"),
    supply: Math.max(0, Math.round(num(raw.stack_count) ?? 0)),
    floorUsd: usdOf(floor?.price_details),
    floorNative: nativeOf(floor?.price_details),
    bidUsd: usdOf(topBid?.price_details),
    lastUsd: usdOf(last?.price_details?.[0]),
    lastAt: typeof last?.created_at === "string" ? last.created_at : null,
    listed: Array.isArray(raw.listings) ? raw.listings.length : 0,
    floorToken: typeof floor?.token_id === "string" ? floor.token_id : null,
  };
}

interface Page<T> {
  result?: T[];
  page?: { next_cursor?: string | null };
}

/** Todos los modelos con publicaciones activas de una colección. */
export async function listListedStacks(client: ImmutableClient, contract: string, maxPages = 40): Promise<NftStack[]> {
  const out: NftStack[] = [];
  let cursor: string | null | undefined = null;
  for (let page = 0; page < maxPages; page++) {
    const url =
      `${IMX_BASE}/search/stacks?contract_address=${contract}&page_size=200&only_if_has_active_listings=true` +
      (cursor ? `&page_cursor=${encodeURIComponent(cursor)}` : "");
    const body: Page<RawStackResult> = await client.get(url);
    for (const raw of body.result ?? []) {
      const s = normalizeStack(raw);
      if (s) out.push(s);
    }
    cursor = body.page?.next_cursor;
    if (!cursor) break;
  }
  return out;
}

/** Modelos por id (para la ficha en vivo o completar datos). */
export async function getStacks(client: ImmutableClient, ids: string[]): Promise<NftStack[]> {
  const out: NftStack[] = [];
  const clean = [...new Set(ids.filter((id) => SAFE_ID.test(id)))];
  for (let i = 0; i < clean.length; i += 20) {
    const q = clean
      .slice(i, i + 20)
      .map((id) => `stack_id=${id}`)
      .join("&");
    const body: RawStackResult[] = await client.get(`${IMX_BASE}/stacks?${q}`);
    for (const raw of Array.isArray(body) ? body : []) {
      const s = normalizeStack(raw);
      if (s) out.push(s);
    }
  }
  return out;
}

interface RawActivity {
  id?: string;
  indexed_at?: string;
  details?: {
    asset?: { contract_address?: string; token_id?: string }[];
    payment?: { price_including_fees?: string; token?: { contract_address?: string | null } };
  };
}

export function normalizeSale(raw: RawActivity): NftSale | null {
  const asset = raw?.details?.asset?.[0];
  const pay = raw?.details?.payment;
  if (!raw?.id || !raw.indexed_at || !asset?.contract_address || !asset.token_id || !pay?.price_including_fees) return null;
  const tokenAddr = pay.token?.contract_address?.toLowerCase() ?? "native";
  const token = PAYMENT_TOKENS[tokenAddr];
  if (!token) return null;
  const amount = Number(pay.price_including_fees) / 10 ** token.decimals;
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return {
    id: raw.id,
    at: raw.indexed_at,
    c: asset.contract_address.toLowerCase(),
    tokenId: asset.token_id,
    amount,
    symbol: token.symbol,
    rateId: token.rateId,
  };
}

/**
 * Ventas de una colección desde la más nueva hacia atrás, hasta llegar a
 * `untilIso` (exclusive) o a maxPages. La API no filtra por fecha.
 */
export async function listSalesSince(
  client: ImmutableClient,
  contract: string,
  untilIso: string,
  maxPages: number,
): Promise<{ sales: NftSale[]; complete: boolean }> {
  const until = Date.parse(untilIso);
  const sales: NftSale[] = [];
  let cursor: string | null | undefined = null;
  for (let page = 0; page < maxPages; page++) {
    const url =
      `${IMX_BASE}/activities?contract_address=${contract}&activity_type=sale&page_size=200` +
      (cursor ? `&page_cursor=${encodeURIComponent(cursor)}` : "");
    const body: Page<RawActivity> = await client.get(url);
    for (const raw of body.result ?? []) {
      const sale = normalizeSale(raw);
      if (!sale) continue;
      if (Date.parse(sale.at) <= until) return { sales, complete: true };
      sales.push(sale);
    }
    cursor = body.page?.next_cursor;
    if (!cursor) return { sales, complete: true };
  }
  return { sales, complete: false };
}

export type NftActivityKind = "sale" | "mint" | "burn";

/**
 * Cuántas ventas, acuñadas o quemadas hubo por día (fecha "AAAA-MM-DD", UTC)
 * después de `untilIso`, de la más nueva hacia atrás. La API las ordena "casi"
 * de la más nueva a la más vieja (con empates desordenados), así que cada página
 * se recorre entera y se corta recién cuando toda una página es vieja.
 */
export async function countActivitiesSince(
  client: ImmutableClient,
  contract: string,
  kind: NftActivityKind,
  untilIso: string,
  maxPages: number,
): Promise<{ perDay: Record<string, number>; newest: string | null; oldest: string | null; complete: boolean }> {
  const until = Date.parse(untilIso);
  const perDay: Record<string, number> = {};
  let newest: string | null = null;
  let oldest: string | null = null;
  let cursor: string | null | undefined = null;
  for (let page = 0; page < maxPages; page++) {
    const url =
      `${IMX_BASE}/activities?contract_address=${contract}&activity_type=${kind}&page_size=200` +
      (cursor ? `&page_cursor=${encodeURIComponent(cursor)}` : "");
    const body: Page<{ indexed_at?: string }> = await client.get(url);
    let reachedOld = false;
    for (const raw of body.result ?? []) {
      const at = raw?.indexed_at;
      const t = at ? Date.parse(at) : NaN;
      if (!at || !Number.isFinite(t)) continue;
      if (t <= until) {
        reachedOld = true;
        continue;
      }
      if (!newest || at > newest) newest = at;
      if (!oldest || at < oldest) oldest = at;
      const day = at.slice(0, 10);
      perDay[day] = (perDay[day] ?? 0) + 1;
    }
    cursor = body.page?.next_cursor;
    if (reachedOld || !cursor) return { perDay, newest, oldest, complete: true };
  }
  return { perDay, newest, oldest, complete: false };
}

/** Cuántas unidades existen de una colección (suma de las de cada modelo) y cuántos modelos tiene. */
export async function countSupply(
  client: ImmutableClient,
  contract: string,
  maxPages = 80,
): Promise<{ units: number; models: number; complete: boolean }> {
  let units = 0;
  let models = 0;
  let cursor: string | null | undefined = null;
  for (let page = 0; page < maxPages; page++) {
    const url = `${IMX_BASE}/search/stacks?contract_address=${contract}&page_size=200` + (cursor ? `&page_cursor=${encodeURIComponent(cursor)}` : "");
    const body: Page<RawStackResult> = await client.get(url);
    for (const raw of body.result ?? []) {
      const n = num(raw.stack_count);
      if (n !== null && n > 0) units += Math.round(n);
      models++;
    }
    cursor = body.page?.next_cursor;
    if (!cursor) return { units, models, complete: true };
  }
  return { units, models, complete: false };
}

interface RawNft {
  token_id?: string;
  metadata_id?: string | null;
  name?: string | null;
  image?: string | null;
  attributes?: { trait_type?: string; value?: unknown }[];
}

export interface NftTokenInfo {
  stackId: string;
  n: string;
  img: string;
  rarity: string;
  type: string;
}

/** A qué modelo pertenece cada token (la API acepta hasta 30 por pedido). */
export async function lookupTokens(
  client: ImmutableClient,
  contract: string,
  tokenIds: string[],
): Promise<Map<string, NftTokenInfo>> {
  const out = new Map<string, NftTokenInfo>();
  const ids = [...new Set(tokenIds.filter((t) => /^\d{1,40}$/.test(t)))];
  for (let i = 0; i < ids.length; i += 30) {
    const q = ids
      .slice(i, i + 30)
      .map((t) => `token_id=${t}`)
      .join("&");
    const body: Page<RawNft> = await client.get(`${IMX_BASE}/collections/${contract}/nfts?${q}&page_size=30`);
    for (const nft of body.result ?? []) {
      if (!nft.token_id || !nft.metadata_id || !SAFE_ID.test(nft.metadata_id)) continue;
      const attrs = new Map((nft.attributes ?? []).map((a) => [a.trait_type ?? "", a.value]));
      out.set(nft.token_id, {
        stackId: nft.metadata_id,
        n: (nft.name ?? "Sin nombre").slice(0, 120),
        img: typeof nft.image === "string" && nft.image.startsWith("https://") ? nft.image : "",
        rarity: typeof attrs.get("rarity") === "string" ? String(attrs.get("rarity")) : "",
        type: typeof attrs.get("itemType") === "string" ? String(attrs.get("itemType")) : "",
      });
    }
  }
  return out;
}

/** Cotización en USD de las monedas de pago (del servicio de Immutable). */
export async function fetchRates(client: ImmutableClient): Promise<Rates> {
  const body: Record<string, { usd?: number }> = await client.get(
    `${FIAT_URL}?ids=ethereum,immutable-x,usd-coin,tether&currencies=usd`,
  );
  const rates: Rates = {};
  for (const [id, v] of Object.entries(body ?? {})) if (typeof v?.usd === "number" && v.usd > 0) rates[id] = v.usd;
  if (!rates.ethereum) throw new Error("No se pudo obtener la cotización de ETH");
  return rates;
}

export function saleUsd(sale: Pick<NftSale, "amount" | "rateId">, rates: Rates): number | null {
  const r = rates[sale.rateId];
  return r ? sale.amount * r : null;
}
