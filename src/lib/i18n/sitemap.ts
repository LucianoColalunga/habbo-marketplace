import type { MetadataRoute } from "next";
import type { HotelCode } from "@/lib/hotels";
import { NFT_COLLECTIONS } from "@/lib/nft/collections";
import { LANGS, localePath } from "./config";
import { languageAlternates } from "./seo";

/** Cuántos furnis por hotel y cuántos NFT van al sitemap (los más activos). */
export const SITEMAP_FURNI_PER_HOTEL = 500;
export const SITEMAP_NFT_ITEMS = 200;

const MARKET_KINDS = ["volumen", "subas", "bajas", "caros", "ofertados"] as const;
const NFT_KINDS = ["volumen", "subas", "bajas", "ofertas", "caros"] as const;

interface PageSpec {
  path: string;
  lastModified?: string | null;
  changeFrequency: "daily" | "weekly" | "monthly";
  priority: number;
}

export interface SitemapInput {
  hotels: HotelCode[];
  furni: Partial<Record<HotelCode, { keys: string[]; generatedAt: string | null }>>;
  nft: { ids: string[]; generatedAt: string | null };
}

/** Lista de páginas que conviene que Google conozca, cada una en los tres idiomas. */
export function sitemapPages({ hotels, furni, nft }: SitemapInput): PageSpec[] {
  const pages: PageSpec[] = [];
  for (const h of hotels) {
    const at = furni[h]?.generatedAt ?? null;
    pages.push({ path: `/${h}`, lastModified: at, changeFrequency: "daily", priority: 1 });
    pages.push({ path: `/${h}/rankings`, lastModified: at, changeFrequency: "daily", priority: 0.8 });
    for (const k of MARKET_KINDS) pages.push({ path: `/${h}/rankings/${k}`, lastModified: at, changeFrequency: "daily", priority: 0.7 });
    pages.push({ path: `/${h}/ofertas`, lastModified: at, changeFrequency: "daily", priority: 0.8 });
    pages.push({ path: `/${h}/alertas`, changeFrequency: "monthly", priority: 0.4 });
    pages.push({ path: `/${h}/acerca`, changeFrequency: "monthly", priority: 0.3 });
    for (const k of furni[h]?.keys ?? []) {
      pages.push({ path: `/${h}/furni/${encodeURIComponent(k)}`, lastModified: at, changeFrequency: "daily", priority: 0.6 });
    }
  }
  const at = nft.generatedAt;
  pages.push({ path: "/nft", lastModified: at, changeFrequency: "daily", priority: 0.9 });
  pages.push({ path: "/nft/rankings", lastModified: at, changeFrequency: "daily", priority: 0.7 });
  for (const k of NFT_KINDS) pages.push({ path: `/nft/rankings/${k}`, lastModified: at, changeFrequency: "daily", priority: 0.6 });
  for (const c of NFT_COLLECTIONS) {
    pages.push({ path: `/nft/coleccion/${c.slug}`, lastModified: at, changeFrequency: "daily", priority: 0.7 });
    for (const k of NFT_KINDS) pages.push({ path: `/nft/coleccion/${c.slug}/${k}`, lastModified: at, changeFrequency: "daily", priority: 0.5 });
  }
  pages.push({ path: "/nft/acerca", changeFrequency: "monthly", priority: 0.3 });
  for (const id of nft.ids) pages.push({ path: `/nft/item/${id}`, lastModified: at, changeFrequency: "daily", priority: 0.5 });
  return pages;
}

/** Entradas del sitemap: cada página en cada idioma, con enlaces a sus otras versiones. */
export function buildSitemap(base: string, input: SitemapInput): MetadataRoute.Sitemap {
  const out: MetadataRoute.Sitemap = [];
  for (const page of sitemapPages(input)) {
    const languages = Object.fromEntries(Object.entries(languageAlternates(page.path)).map(([k, v]) => [k, base + v]));
    for (const lang of LANGS) {
      out.push({
        url: base + localePath(lang, page.path),
        ...(page.lastModified ? { lastModified: page.lastModified } : {}),
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: { languages },
      });
    }
  }
  return out;
}
