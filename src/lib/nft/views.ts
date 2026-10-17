import { cacheLife, cacheTag } from "next/cache";
import { normalize } from "@/lib/search";
import { getStorage } from "@/lib/storage";
import { collectionByAddress, NFT_COLLECTIONS, type NftCollectionSlug } from "./collections";
import type { NftDayPoint, NftHistory, NftRow, NftSnapPoint, NftSummary } from "./model";
import { buildNftRanking, nftTotals, type NftRankingKind, type NftTotals } from "./rankings";
import { nftKeys } from "./scan";

/**
 * Vistas de la sección NFT (separada del Marketplace de créditos). Igual que
 * las del Marketplace: datos chicos y serializables, con caché de 10 minutos.
 */

const memo = new Map<string, { at: number; promise: Promise<unknown> }>();
function remember<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.promise as Promise<T>;
  const promise = load();
  memo.set(key, { at: Date.now(), promise });
  promise.catch(() => memo.delete(key));
  return promise;
}

async function loadSummary(): Promise<NftSummary | null> {
  return remember("nft:summary", 60_000, async () => (await (await getStorage()).read<NftSummary>(nftKeys.summary()))?.data ?? null);
}

async function loadHistory(): Promise<NftHistory | null> {
  return remember("nft:history", 5 * 60_000, async () => (await (await getStorage()).read<NftHistory>(nftKeys.history()))?.data ?? null);
}

export function forgetNft() {
  memo.clear();
}

export interface NftMeta {
  hasData: boolean;
  generatedAt: string | null;
  ethUsd: number | null;
  imxUsd: number | null;
}

export interface NftCollectionCard {
  slug: NftCollectionSlug;
  name: string;
  official: string;
  listed: number;
  floorUsd: number | null;
  sales7: number;
  volume7: number;
  img: string;
}

export interface NftHomeView {
  meta: NftMeta;
  totals: NftTotals | null;
  collections: NftCollectionCard[];
  vendidos: NftRow[];
  subas: NftRow[];
  bajas: NftRow[];
  ofertas: NftRow[];
}

function metaOf(s: NftSummary | null): NftMeta {
  return {
    hasData: Boolean(s),
    generatedAt: s?.generatedAt ?? null,
    ethUsd: s?.rates.ethereum ?? null,
    imxUsd: s?.rates["immutable-x"] ?? null,
  };
}

export async function getNftMeta(): Promise<NftMeta> {
  "use cache";
  cacheLife("market");
  cacheTag("nft");
  return metaOf(await loadSummary());
}

export async function getNftHome(): Promise<NftHomeView> {
  "use cache";
  cacheLife("market");
  cacheTag("nft");
  const s = await loadSummary();
  const rows = s ? Object.values(s.stacks) : [];
  const collections = NFT_COLLECTIONS.map((c) => {
    const mine = rows.filter((r) => r.c === c.address);
    const floors = mine.map((r) => r.floorUsd).filter((v): v is number => v !== null);
    const top = [...mine].sort((a, b) => b.s7 - a.s7)[0];
    return {
      slug: c.slug,
      name: c.name,
      official: c.official,
      listed: floors.length,
      floorUsd: floors.length ? Math.min(...floors) : null,
      sales7: mine.reduce((n, r) => n + r.s7, 0),
      volume7: Math.round(mine.reduce((n, r) => n + r.v7, 0)),
      img: top?.img ?? "",
    };
  });
  return {
    meta: metaOf(s),
    totals: s ? nftTotals(rows) : null,
    collections,
    vendidos: buildNftRanking(rows, "vendidos", 6),
    subas: buildNftRanking(rows, "subas", 6),
    bajas: buildNftRanking(rows, "bajas", 6),
    ofertas: buildNftRanking(rows, "ofertas", 6),
  };
}

export async function getNftRanking(kind: NftRankingKind, slug: NftCollectionSlug | null, limit = 100): Promise<NftRow[]> {
  "use cache";
  cacheLife("market");
  cacheTag("nft");
  const s = await loadSummary();
  if (!s) return [];
  const address = slug ? NFT_COLLECTIONS.find((c) => c.slug === slug)?.address : null;
  const rows = Object.values(s.stacks).filter((r) => !address || r.c === address);
  return buildNftRanking(rows, kind, limit);
}

export interface NftItemView {
  row: NftRow | null;
  collection: NftCollectionSlug | null;
  days: NftDayPoint[];
  snaps: NftSnapPoint[];
  generatedAt: string | null;
}

export async function getNftItem(id: string): Promise<NftItemView> {
  "use cache";
  cacheLife("market");
  cacheTag("nft");
  const [s, h] = await Promise.all([loadSummary(), loadHistory()]);
  const row = s?.stacks[id] ?? null;
  return {
    row,
    collection: row ? (collectionByAddress(row.c)?.slug ?? null) : null,
    days: h?.days[id] ?? [],
    snaps: h?.snaps[id] ?? [],
    generatedAt: s?.generatedAt ?? null,
  };
}

export async function searchNft(query: string, limit = 24): Promise<NftRow[]> {
  "use cache";
  cacheLife("market");
  cacheTag("nft");
  const q = normalize(query.slice(0, 60));
  if (q.length < 2) return [];
  const s = await loadSummary();
  if (!s) return [];
  const scored: { r: NftRow; score: number }[] = [];
  for (const r of Object.values(s.stacks)) {
    const name = normalize(r.n);
    const score = name === q ? 100 : name.startsWith(q) ? 80 : name.split(" ").some((w) => w.startsWith(q)) ? 60 : name.includes(q) ? 40 : 0;
    if (score > 0) scored.push({ r, score });
  }
  scored.sort((a, b) => b.score - a.score || b.r.s7 - a.r.s7 || a.r.n.localeCompare(b.r.n));
  return scored.slice(0, limit).map((x) => x.r);
}
