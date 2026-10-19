import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { LANG_INFO, LANGS, localePath, type Lang } from "./config";
import type { Pages } from "./pages/es";

const OG_LOCALE: Record<Lang, string> = { es: "es_AR", pt: "pt_BR", en: "en_US" };

/** La misma página en los tres idiomas (hreflang); x-default es la versión en español. */
export function languageAlternates(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const lang of LANGS) out[LANG_INFO[lang].html] = localePath(lang, path);
  out["x-default"] = localePath("es", path);
  return out;
}

/** Imagen para compartir de cada sección e idioma (archivos estáticos en public/og). */
export function ogImage(lang: Lang, section: "market" | "nft", p: Pages) {
  return {
    url: `/og/${section}-${lang}.png`,
    width: 1200,
    height: 630,
    alt: section === "nft" ? p.seo.ogAltNft : p.seo.ogAltMarket,
  };
}

/**
 * Metadata completa de una página: título, descripción, dirección canónica,
 * versiones en los otros idiomas y tarjeta para compartir en redes y chats.
 * `path` es la ruta sin idioma, por ejemplo "/com/furni/throne" o "/nft".
 */
export function pageMeta({
  lang,
  p,
  path,
  title,
  description,
  section = "market",
  noindex = false,
}: {
  lang: Lang;
  p: Pages;
  path: string;
  title: string;
  description: string;
  section?: "market" | "nft";
  noindex?: boolean;
}): Metadata {
  const url = localePath(lang, path);
  const template = section === "nft" ? p.meta.nftTemplate : p.meta.template;
  const fullTitle = template.replace("%s", title);
  const image = ogImage(lang, section, p);
  return {
    title,
    description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: OG_LOCALE[lang],
      alternateLocale: LANGS.filter((l) => l !== lang).map((l) => OG_LOCALE[l]),
      url,
      title: fullTitle,
      description,
      images: [image],
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [image.url] },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
