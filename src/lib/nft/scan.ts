import { toDateNum } from "@/lib/market/history";
import { getStorage, type Storage } from "@/lib/storage";
import {
  countActivitiesSince,
  countSupply,
  fetchRates,
  ImmutableClient,
  listListedStacks,
  listSalesSince,
  lookupTokens,
  saleUsd,
  type ClientOptions,
  type NftActivityKind,
  type NftSale,
  type NftStack,
  type Rates,
} from "./api";
import { NFT_COLLECTIONS } from "./collections";
import {
  emptyNftHistory,
  type NftCollectionDay,
  type NftCollectionStats,
  type NftDayPoint,
  type NftFlowPoint,
  type NftHistory,
  type NftRow,
  type NftSummary,
  type NftSupplyPoint,
} from "./model";

export const nftKeys = {
  summary: () => "nft/summary.json.gz",
  history: () => "nft/history.json.gz",
};

const DAY_MS = 86_400_000;
const DAY_RETENTION = 400;
const SNAP_RETENTION = 240;
const SNAP_REFRESH_MIN = 20 * 60;
const TOKEN_CACHE_MAX = 80_000;
const META_MAX = 20_000;

export interface NftScanOptions extends ClientOptions {
  storage?: Storage;
  /** Días hacia atrás que se cargan la primera vez. */
  backfillDays?: number;
  /** Tope de páginas de ventas por colección y corrida (200 ventas por página). */
  maxSalePages?: number;
  /** Momento (ms) a partir del cual no se hacen pedidos nuevos. */
  deadline?: number;
  /** Días hacia atrás que se cuentan la primera vez (ventas, acuñadas y quemadas por colección). */
  flowBackfillDays?: number;
  /** Tope de páginas de 200 por tipo de movimiento, colección y corrida. */
  maxActivityPages?: number;
  log?: (m: string) => void;
  nowDate?: () => Date;
}

/** Suma ventas nuevas al historial diario de cada modelo. */
export function addSalesToDays(
  days: Record<string, NftDayPoint[]>,
  sales: { stackId: string; at: string; usd: number }[],
): void {
  for (const s of sales) {
    const date = toDateNum(Date.parse(s.at));
    const list = (days[s.stackId] ??= []);
    const last = list[list.length - 1];
    const existing = last && last[0] === date ? last : list.find((p) => p[0] === date);
    if (existing) {
      existing[1] += 1;
      existing[2] = Math.round((existing[2] + s.usd) * 100) / 100;
    } else {
      list.push([date, 1, Math.round(s.usd * 100) / 100]);
      list.sort((a, b) => a[0] - b[0]);
    }
  }
}

function windowStats(points: NftDayPoint[] | undefined, fromDate: number, toDate: number) {
  let count = 0;
  let usd = 0;
  for (const p of points ?? []) {
    if (p[0] >= fromDate && p[0] <= toDate) {
      count += p[1];
      usd += p[2];
    }
  }
  return { count, usd, avg: count > 0 ? usd / count : null };
}

const round2 = (n: number | null) => (n === null ? null : Math.round(n * 100) / 100);

/** Arma las filas del resumen a partir de los modelos a la venta y del historial de ventas. */
export function buildRows(listed: NftStack[], history: NftHistory, now: Date, scanMin: number): Record<string, NftRow> {
  const today = now.getTime();
  const d = (offset: number) => toDateNum(today - offset * DAY_MS);
  const rows: Record<string, NftRow> = {};
  const add = (base: Omit<NftRow, "s7" | "s7p" | "s30" | "v7" | "a7" | "p7" | "a30" | "sp">) => {
    const pts = history.days[base.id];
    const w7 = windowStats(pts, d(6), d(0));
    const prev = windowStats(pts, d(13), d(7));
    const w30 = windowStats(pts, d(29), d(0));
    const sp: (number | null)[] = [];
    for (let i = 29; i >= 0; i--) {
      const p = pts?.find((x) => x[0] === d(i));
      sp.push(p && p[1] > 0 ? Math.round((p[2] / p[1]) * 100) / 100 : null);
    }
    rows[base.id] = {
      ...base,
      s7: w7.count,
      s7p: prev.count,
      s30: w30.count,
      v7: Math.round(w7.usd * 100) / 100,
      a7: round2(w7.avg),
      p7: round2(prev.avg),
      a30: round2(w30.avg),
      sp: sp.some((v) => v !== null) ? sp : [],
    };
  };
  for (const s of listed) add({ ...s, at: scanMin });
  // Modelos sin publicaciones hoy pero con ventas en los últimos 30 días.
  for (const [id, pts] of Object.entries(history.days)) {
    if (rows[id] || !pts.some((p) => p[0] >= d(29))) continue;
    const m = history.meta[id];
    if (!m) continue;
    add({
      id,
      c: m.c,
      n: m.n,
      img: m.img,
      rarity: m.rarity,
      type: m.type,
      subType: "",
      set: "",
      source: "",
      code: "",
      supply: 0,
      floorUsd: null,
      floorNative: null,
      bidUsd: null,
      lastUsd: null,
      lastAt: null,
      listed: 0,
      floorToken: null,
      at: scanMin,
    });
  }
  return rows;
}

const FLOW_INDEX: Record<NftActivityKind, 1 | 2 | 3> = { sale: 1, mint: 2, burn: 3 };

/** Suma los conteos por día ("AAAA-MM-DD") de un tipo de movimiento al historial de una colección. */
export function addFlows(flows: Record<string, NftFlowPoint[]>, address: string, kind: NftActivityKind, perDay: Record<string, number>): void {
  const list = (flows[address] ??= []);
  for (const [day, n] of Object.entries(perDay)) {
    const date = toDateNum(Date.parse(`${day}T00:00:00Z`));
    let point = list.find((x) => x[0] === date);
    if (!point) {
      point = [date, 0, 0, 0];
      list.push(point);
    }
    point[FLOW_INDEX[kind]] += n;
  }
  list.sort((a, b) => a[0] - b[0]);
}

/** Guarda la medición de cuántas existen (una por día: la última). */
export function setSupply(supply: Record<string, NftSupplyPoint[]>, address: string, date: number, units: number, models: number): void {
  const list = (supply[address] ??= []);
  const last = list[list.length - 1];
  if (last && last[0] === date) {
    last[1] = units;
    last[2] = models;
  } else {
    list.push([date, units, models]);
  }
}

/** Fecha AAAAMMDD del día siguiente al de un momento ISO. */
function dayAfter(iso: string): number {
  return toDateNum(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) + DAY_MS);
}

const dateMs = (date: number) => Date.UTC(Math.floor(date / 10000), Math.floor(date / 100) % 100 - 1, date % 100);

/**
 * Resumen de cada colección: los últimos 30 días completos (sin hoy) y cuántas
 * existen. "Existentes al final de cada día" se calcula para atrás desde la
 * última medición: la de ese momento menos las acuñadas y más las quemadas de
 * los días siguientes (solo con días de conteo completo).
 */
export function buildCollectionStats(history: NftHistory, now: Date): Record<string, NftCollectionStats> {
  const out: Record<string, NftCollectionStats> = {};
  const today = toDateNum(now.getTime());
  for (const col of NFT_COLLECTIONS) {
    const flows = history.flows?.[col.address] ?? [];
    const start = history.flowStart?.[col.address];
    const supply = history.supply?.[col.address] ?? [];
    const last = supply[supply.length - 1];
    const byDate = new Map(flows.map((p) => [p[0], p]));
    const days: NftCollectionDay[] = [];
    if (start !== undefined) {
      for (let i = 30; i >= 1; i--) {
        const date = toDateNum(now.getTime() - i * DAY_MS);
        if (date < start || date >= today) continue;
        const p = byDate.get(date);
        days.push([date, p?.[1] ?? 0, p?.[2] ?? 0, p?.[3] ?? 0, null]);
      }
    }
    // Existentes al final de cada día, para atrás desde la medición de hoy.
    if (last && last[0] === today && days.length > 0) {
      let units = last[1];
      // Lo acuñado y quemado el día de la medición (hasta la corrida) se descuenta primero.
      const sameDay = byDate.get(last[0]);
      units -= (sameDay?.[2] ?? 0) - (sameDay?.[3] ?? 0);
      for (let i = days.length - 1; i >= 0; i--) {
        const day = days[i];
        // Solo si no falta ningún día entre este y la medición.
        const next = i === days.length - 1 ? last[0] : days[i + 1][0];
        if (dateMs(next) - dateMs(day[0]) !== DAY_MS) break;
        day[4] = units;
        units -= day[2] - day[3];
      }
    }
    out[col.slug] = {
      units: last ? last[1] : null,
      models: last ? last[2] : null,
      measuredAt: last ? new Date(dateMs(last[0])).toISOString().slice(0, 10) : null,
      days,
    };
  }
  return out;
}

function pruneRecord<T>(rec: Record<string, T>, max: number): Record<string, T> {
  const entries = Object.entries(rec);
  return entries.length <= max ? rec : Object.fromEntries(entries.slice(entries.length - max));
}

export async function runNftScan(options: NftScanOptions = {}): Promise<NftSummary> {
  const storage = options.storage ?? (await getStorage());
  const nowDate = options.nowDate ?? (() => new Date());
  const log = options.log ?? (() => {});
  const started = nowDate();
  const deadline = options.deadline ?? Number.POSITIVE_INFINITY;
  const timeLeft = () => Date.now() < deadline;
  const client = new ImmutableClient(options);
  const errors: string[] = [];
  let complete = true;

  const history = (await storage.read<NftHistory>(nftKeys.history()))?.data ?? emptyNftHistory();
  const rates: Rates = await fetchRates(client);

  // 1) Modelos con publicaciones activas.
  const listed: NftStack[] = [];
  for (const col of NFT_COLLECTIONS) {
    if (!timeLeft()) {
      complete = false;
      break;
    }
    try {
      const stacks = await listListedStacks(client, col.address);
      listed.push(...stacks);
      log(`${col.official}: ${stacks.length} modelos a la venta`);
    } catch (error) {
      complete = false;
      errors.push(`${col.official}: ${(error as Error).message}`);
    }
  }

  // 2) Ventas nuevas desde la corrida anterior.
  const backfillFrom = new Date(started.getTime() - (options.backfillDays ?? 7) * DAY_MS).toISOString();
  const newSales: (NftSale & { usd: number })[] = [];
  for (const col of NFT_COLLECTIONS) {
    if (!timeLeft()) {
      complete = false;
      break;
    }
    const since = history.lastSaleAt[col.address] ?? backfillFrom;
    try {
      const { sales, complete: done } = await listSalesSince(client, col.address, since, options.maxSalePages ?? 60);
      if (!done) complete = false;
      for (const s of sales) {
        const usd = saleUsd(s, rates);
        if (usd !== null) newSales.push({ ...s, usd });
      }
      if (sales.length > 0) history.lastSaleAt[col.address] = sales[0].at;
      log(`${col.official}: ${sales.length} ventas nuevas${done ? "" : " (se cortó por el tope de páginas)"}`);
    } catch (error) {
      complete = false;
      errors.push(`${col.official} ventas: ${(error as Error).message}`);
    }
  }

  // 3) A qué modelo pertenece cada token vendido (con caché).
  const stackOfListed = new Map(listed.map((s) => [s.id, s]));
  let lookups = 0;
  for (const col of NFT_COLLECTIONS) {
    const unknown = newSales.filter((s) => s.c === col.address && !history.tokens[`${s.c}:${s.tokenId}`]).map((s) => s.tokenId);
    if (unknown.length === 0) continue;
    if (!timeLeft()) {
      complete = false;
      break;
    }
    try {
      const before = client.requests;
      const found = await lookupTokens(client, col.address, unknown);
      lookups += client.requests - before;
      for (const [tokenId, info] of found) {
        history.tokens[`${col.address}:${tokenId}`] = info.stackId;
        if (!stackOfListed.has(info.stackId)) {
          history.meta[info.stackId] = { c: col.address, n: info.n, img: info.img, rarity: info.rarity, type: info.type };
        }
      }
    } catch (error) {
      complete = false;
      errors.push(`${col.official} tokens: ${(error as Error).message}`);
    }
  }
  const mapped = newSales
    .map((s) => ({ stackId: history.tokens[`${s.c}:${s.tokenId}`], at: s.at, usd: s.usd }))
    .filter((s): s is { stackId: string; at: string; usd: number } => Boolean(s.stackId));
  addSalesToDays(history.days, mapped);

  // 4) Movimiento de cada colección: ventas, acuñadas y quemadas por día, y cuántas existen.
  history.flows ??= {};
  history.supply ??= {};
  history.lastActivityAt ??= {};
  history.flowStart ??= {};
  const flowBackfill = new Date(started.getTime() - (options.flowBackfillDays ?? 7) * DAY_MS).toISOString();
  for (const col of NFT_COLLECTIONS) {
    if (!timeLeft()) {
      complete = false;
      break;
    }
    // La primera vez el conteo empieza a mitad de un día: ese día queda incompleto.
    let start = history.flowStart[col.address] ?? dayAfter(flowBackfill);
    try {
      for (const kind of ["sale", "mint", "burn"] as const) {
        const key = `${kind}:${col.address}`;
        const since = history.lastActivityAt[key] ?? flowBackfill;
        const res = await countActivitiesSince(client, col.address, kind, since, options.maxActivityPages ?? 40);
        addFlows(history.flows, col.address, kind, res.perDay);
        history.lastActivityAt[key] = res.newest ?? since;
        if (!res.complete) {
          // Quedó un hueco: los días anteriores al más viejo contado ya no están completos.
          complete = false;
          if (res.oldest) start = Math.max(start, dayAfter(res.oldest));
        }
      }
      history.flowStart[col.address] = start;
      const supply = await countSupply(client, col.address);
      if (supply.complete) setSupply(history.supply, col.address, toDateNum(nowDate().getTime()), supply.units, supply.models);
      else complete = false;
      log(`${col.official}: movimiento contado; existen ${supply.units} en ${supply.models} modelos`);
    } catch (error) {
      complete = false;
      errors.push(`${col.official} movimiento: ${(error as Error).message}`);
    }
  }

  // 5) Instantáneas del piso y limpieza.
  const finished = nowDate();
  const minute = Math.floor(finished.getTime() / 60000);
  for (const s of listed) {
    if (s.floorUsd === null) continue;
    const list = (history.snaps[s.id] ??= []);
    const last = list[list.length - 1];
    const point: [number, number, number] = [minute, s.floorUsd, s.bidUsd ?? 0];
    if (!last || last[1] !== point[1] || last[2] !== point[2] || minute - last[0] >= SNAP_REFRESH_MIN) list.push(point);
    if (list.length > SNAP_RETENTION) list.splice(0, list.length - SNAP_RETENTION);
  }
  const minDate = toDateNum(finished.getTime() - DAY_RETENTION * DAY_MS);
  for (const [id, pts] of Object.entries(history.days)) {
    const kept = pts.filter((p) => p[0] >= minDate);
    if (kept.length) history.days[id] = kept;
    else delete history.days[id];
  }
  for (const [addr, pts] of Object.entries(history.flows)) history.flows[addr] = pts.filter((p) => p[0] >= minDate);
  for (const [addr, pts] of Object.entries(history.supply)) history.supply[addr] = pts.filter((p) => p[0] >= minDate);
  history.tokens = pruneRecord(history.tokens, TOKEN_CACHE_MAX);
  history.meta = pruneRecord(history.meta, META_MAX);
  history.updatedAt = finished.toISOString();

  const summary: NftSummary = {
    v: 1,
    generatedAt: finished.toISOString(),
    rates,
    scan: {
      startedAt: started.toISOString(),
      durationMs: finished.getTime() - started.getTime(),
      requests: client.requests,
      listedStacks: listed.length,
      newSales: mapped.length,
      lookups,
      complete,
      errors: errors.slice(0, 10),
    },
    stacks: buildRows(listed, history, finished, minute),
    collections: buildCollectionStats(history, finished),
  };
  if (listed.length === 0) throw new Error(`El escaneo NFT no devolvió modelos (${errors[0] ?? "sin detalle"}).`);
  await storage.write(nftKeys.history(), history);
  await storage.write(nftKeys.summary(), summary);
  log(
    `Listo: ${listed.length} modelos a la venta, ${mapped.length} ventas nuevas, ${client.requests} pedidos, ` +
      `${Math.round(summary.scan.durationMs / 1000)} s${complete ? "" : " (incompleto)"}.`,
  );
  return summary;
}
