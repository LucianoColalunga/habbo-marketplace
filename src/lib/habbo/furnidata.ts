import { hotelBaseUrl, type HotelCode } from "@/lib/hotels";
import { USER_AGENT, type FurniType } from "@/lib/habbo/api";

/**
 * Catálogo de furnis a partir del "furnidata" público de cada hotel:
 *   GET https://www.habbo.<tld>/gamedata/hashes2          -> hash actual del furnidata
 *   GET https://www.habbo.<tld>/gamedata/furnidata_json/1 -> redirige a la versión actual (~10 MB)
 * Solo nos quedamos con los furnis marcados como "tradeable" (los únicos que
 * pueden aparecer en el Marketplace) y con los campos que usa la web.
 */

export interface CatalogItem {
  /** classname, por ejemplo "throne" o "rare_dragonlamp*1". */
  k: string;
  t: FurniType;
  /** Nombre en el idioma del hotel. */
  n: string;
  /** Descripción en el idioma del hotel. */
  d: string;
  /** Revisión (se usa para armar la URL de la imagen). */
  r: number;
  /** Categoría (chair, table, other...). */
  c: string;
  /** Línea de furni (rare, iced, ...). */
  l: string;
}

export interface Catalog {
  v: 1;
  hotel: HotelCode;
  hash: string;
  fetchedAt: string;
  items: CatalogItem[];
}

interface RawFurni {
  classname?: string;
  name?: string | null;
  description?: string | null;
  revision?: number;
  category?: string | null;
  furniline?: string | null;
  tradeable?: boolean;
}

interface RawFurnidata {
  roomitemtypes?: { furnitype?: RawFurni[] };
  wallitemtypes?: { furnitype?: RawFurni[] };
}

function clean(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

export function compactFurnidata(raw: RawFurnidata, hotel: HotelCode, hash: string, fetchedAt: string): Catalog {
  const items: CatalogItem[] = [];
  const seen = new Set<string>();
  const add = (list: RawFurni[] | undefined, t: FurniType) => {
    for (const f of list ?? []) {
      if (!f || f.tradeable !== true || typeof f.classname !== "string" || !f.classname) continue;
      const key = `${t}:${f.classname}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        k: f.classname,
        t,
        n: clean(f.name) || f.classname,
        d: clean(f.description),
        r: Number.isFinite(f.revision) ? Number(f.revision) : 0,
        c: clean(f.category) || "other",
        l: clean(f.furniline),
      });
    }
  };
  add(raw.roomitemtypes?.furnitype, "r");
  add(raw.wallitemtypes?.furnitype, "w");
  return { v: 1, hotel, hash, fetchedAt, items };
}

interface HashesResponse {
  hashes?: { name?: string; hash?: string }[];
}

export async function fetchFurnidataHash(hotel: HotelCode, fetchImpl: typeof fetch = fetch): Promise<string> {
  const res = await fetchImpl(`${hotelBaseUrl(hotel)}/gamedata/hashes2`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`hashes2 respondió ${res.status}`);
  const body = (await res.json()) as HashesResponse;
  const hash = body.hashes?.find((h) => h.name === "furnidata")?.hash;
  if (!hash) throw new Error("hashes2 no trae el hash del furnidata");
  return hash;
}

export async function fetchCatalog(hotel: HotelCode, hash: string, fetchImpl: typeof fetch = fetch): Promise<Catalog> {
  const res = await fetchImpl(`${hotelBaseUrl(hotel)}/gamedata/furnidata_json/${encodeURIComponent(hash)}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`furnidata respondió ${res.status}`);
  const raw = (await res.json()) as RawFurnidata;
  const catalog = compactFurnidata(raw, hotel, hash, new Date().toISOString());
  if (catalog.items.length < 100) throw new Error(`furnidata con muy pocos furnis (${catalog.items.length})`);
  return catalog;
}
