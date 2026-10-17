import type { Catalog, CatalogItem } from "@/lib/habbo/furnidata";
import type { HotelCode } from "@/lib/hotels";
import type { MarketHistory } from "@/lib/market/history";
import type { MarketSummary } from "@/lib/market/summary";
import { getStorage, keys } from "@/lib/storage";

/**
 * Lectura de los archivos del recolector con una memoria corta en el proceso,
 * para no releer varios MB en cada pedido.
 */

interface Entry<T> {
  at: number;
  promise: Promise<T>;
}

const memo = new Map<string, Entry<unknown>>();

function remember<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = memo.get(key) as Entry<T> | undefined;
  if (hit && Date.now() - hit.at < ttlMs) return hit.promise;
  const promise = load();
  memo.set(key, { at: Date.now(), promise });
  promise.catch(() => {
    if (memo.get(key)?.promise === promise) memo.delete(key);
  });
  return promise;
}

async function read<T>(key: string): Promise<T | null> {
  const storage = await getStorage();
  return (await storage.read<T>(key))?.data ?? null;
}

export interface CatalogIndex {
  catalog: Catalog;
  byKey: Map<string, CatalogItem>;
}

export function loadCatalog(hotel: HotelCode): Promise<CatalogIndex | null> {
  return remember(`catalog:${hotel}`, 10 * 60_000, async () => {
    const catalog = await read<Catalog>(keys.catalog(hotel));
    if (!catalog) return null;
    return { catalog, byKey: new Map(catalog.items.map((i) => [i.k, i])) };
  });
}

export function loadSummary(hotel: HotelCode): Promise<MarketSummary | null> {
  return remember(`summary:${hotel}`, 60_000, () => read<MarketSummary>(keys.summary(hotel)));
}

export function loadHistory(hotel: HotelCode): Promise<MarketHistory | null> {
  return remember(`history:${hotel}`, 5 * 60_000, () => read<MarketHistory>(keys.history(hotel)));
}

/** Solo para tests. */
export function clearStoreMemo() {
  memo.clear();
}

/** Olvida lo leído de un hotel (después de una corrida del recolector en este mismo proceso). */
export function forgetHotel(hotel: HotelCode) {
  for (const key of [`catalog:${hotel}`, `summary:${hotel}`, `history:${hotel}`]) memo.delete(key);
}
