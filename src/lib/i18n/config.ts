import { enabledHotels, isHotelCode, type HotelCode } from "../hotels";

/**
 * Idiomas de la interfaz. El español va sin prefijo en la dirección (/es, /com,
 * /nft); portugués e inglés llevan el suyo (/pt/br, /en/nft). Así cada página
 * sigue siendo estática y se sirve desde la caché del CDN.
 *
 * Los nombres de los furnis vienen del furnidata de cada hotel (en el idioma de
 * ese hotel) y los de los NFT, de Immutable (en inglés): no se traducen.
 */
export const LANGS = ["es", "pt", "en"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "es";

/** Cookie que recuerda el idioma elegido (solo la lee la redirección de la portada). */
export const LANG_COOKIE = "fm_lang";

export const LANG_INFO: Record<Lang, { label: string; short: string; html: string; intl: string; hotel: HotelCode }> = {
  es: { label: "Español", short: "ES", html: "es", intl: "es-AR", hotel: "es" },
  pt: { label: "Português", short: "PT", html: "pt-BR", intl: "pt-BR", hotel: "br" },
  en: { label: "English", short: "EN", html: "en", intl: "en-US", hotel: "com" },
};

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (LANGS as readonly string[]).includes(value);
}

/** Dirección visible de una ruta en un idioma: `localePath("en", "/com")` → "/en/com". */
export function localePath(lang: Lang, path: string): string {
  // Siempre una ruta de este sitio: "//otro.com" o "/\otro.com" no pueden salir de acá.
  const clean = `/${path.replace(/^[/\\]+/, "")}`;
  if (lang === DEFAULT_LANG) return clean;
  return clean === "/" ? `/${lang}` : `/${lang}${clean}`;
}

/**
 * Separa idioma y resto de una ruta. Acepta la dirección visible ("/com/x",
 * "/en/com/x") y la interna que ve el servidor ("/es/com/x"), y devuelve lo
 * mismo para las dos, así no hay diferencias entre servidor y navegador.
 */
export function splitLocale(pathname: string): { lang: Lang; rest: string } {
  const parts = pathname.split("/").filter(Boolean);
  const [first, second] = parts;
  if (first === "pt" || first === "en") return { lang: first, rest: `/${parts.slice(1).join("/")}` };
  // "/es/com/..." es la ruta interna del español; "/es/rankings" es el hotel .es.
  if (first === "es" && (second === "nft" || isHotelCode(second))) return { lang: "es", rest: `/${parts.slice(1).join("/")}` };
  return { lang: "es", rest: `/${parts.join("/")}` };
}

/** Hotel con el que arranca cada idioma (si está habilitado). */
export function homeHotel(lang: Lang): HotelCode {
  const preferred = LANG_INFO[lang].hotel;
  const hotels = enabledHotels();
  return hotels.includes(preferred) ? preferred : hotels[0];
}
