import type { MetadataRoute } from "next";
import { getCategoryOverview, getTopFurniKeys } from "@/lib/data/views";
import { enabledHotels } from "@/lib/hotels";
import { buildSitemap, SITEMAP_FURNI_PER_HOTEL, SITEMAP_NFT_ITEMS } from "@/lib/i18n/sitemap";
import { getTopNftIds } from "@/lib/nft/views";
import { siteUrl } from "@/lib/site";

/**
 * /sitemap.xml: páginas principales y los furnis y NFT más activos, en los tres
 * idiomas. No van los ~13.700 furnis de cada hotel: Google encuentra el resto
 * siguiendo enlaces, de a poco, sin gastar de golpe el plan gratuito.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const hotels = enabledHotels();
  const [furniList, catList, nft] = await Promise.all([
    Promise.all(hotels.map((h) => getTopFurniKeys(h, SITEMAP_FURNI_PER_HOTEL))),
    Promise.all(hotels.map((h) => getCategoryOverview(h))),
    getTopNftIds(SITEMAP_NFT_ITEMS),
  ]);
  const furni = Object.fromEntries(hotels.map((h, i) => [h, furniList[i]]));
  const categories = Object.fromEntries(hotels.map((h, i) => [h, catList[i]]));
  return buildSitemap(siteUrl(), { hotels, furni, nft, categories });
}
