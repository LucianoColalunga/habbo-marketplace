import type { Storage, StoredObject } from "@/lib/storage";

/** Almacenamiento en memoria para tests (guarda copias, como si fuera disco). */
export class MemoryStorage implements Storage {
  readonly kind = "fs" as const;
  readonly data = new Map<string, string>();
  writes: string[] = [];

  async read<T>(key: string): Promise<StoredObject<T> | null> {
    const raw = this.data.get(key);
    return raw === undefined ? null : { data: JSON.parse(raw) as T, etag: String(raw.length) };
  }

  async write<T>(key: string, data: T): Promise<void> {
    this.writes.push(key);
    this.data.set(key, JSON.stringify(data));
  }
}

export interface RawItem {
  item: string;
  statsDate?: string;
  currentPrice?: number;
  currentOpenOffers?: number;
  averagePrice?: number;
  history?: { dayOffset: string; averagePrice: string; totalSoldItems: string; totalCreditSum: string; totalOpenOffers: string }[];
}

/** Arma un día del historial tal como lo manda la API (todo como texto). */
export function day(offset: number, avg: number, sold: number, offers = 10) {
  return {
    dayOffset: String(offset),
    averagePrice: String(avg),
    totalSoldItems: String(sold),
    totalCreditSum: String(avg * sold),
    totalOpenOffers: String(offers),
  };
}

export function rawItem(item: string, extra: Partial<RawItem> = {}): RawItem {
  return {
    item,
    statsDate: "2026-10-17",
    currentPrice: 0,
    currentOpenOffers: 0,
    averagePrice: 0,
    history: [],
    ...extra,
  };
}

export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

/** Reloj falso: sleep avanza el tiempo sin esperar de verdad. */
export function fakeClock(start = Date.UTC(2026, 9, 17, 12, 0, 0)) {
  let t = start;
  const sleeps: number[] = [];
  return {
    now: () => t,
    date: () => new Date(t),
    advance: (ms: number) => {
      t += ms;
    },
    sleep: async (ms: number) => {
      sleeps.push(ms);
      t += ms;
    },
    sleeps,
  };
}
