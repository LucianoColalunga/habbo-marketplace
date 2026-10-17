import { HOTELS, type HotelCode } from "../hotels";

/**
 * Redirecciones y reescrituras de los idiomas (las usa next.config.ts; las
 * resuelve el CDN, sin ejecutar funciones). Las páginas viven en /[lang]/...;
 * el español se sirve sin prefijo reescribiendo /com/x → /es/com/x.
 *
 * Sin alias "@/": next.config.ts carga este archivo directamente.
 */
const COOKIE = "fm_lang";
const PREFERRED: Record<"es" | "pt" | "en", HotelCode> = { es: "es", pt: "br", en: "com" };

interface Has {
  type: "cookie" | "header";
  key: string;
  value?: string;
}

export interface RedirectRule {
  source: string;
  destination: string;
  permanent: boolean;
  has?: Has[];
}

function home(lang: "es" | "pt" | "en", hotels: HotelCode[]): string {
  const hotel = hotels.includes(PREFERRED[lang]) ? PREFERRED[lang] : hotels[0];
  return lang === "es" ? `/${hotel}` : `/${lang}/${hotel}`;
}

/** Patrón de los hoteles para las rutas: "(es|com|br|...)". */
function hotelPattern(): string {
  return `(${Object.keys(HOTELS).join("|")})`;
}

export function langRedirects(hotels: HotelCode[]): RedirectRule[] {
  const h = hotelPattern();
  const rules: RedirectRule[] = [];
  // Portada: primero el idioma elegido antes (cookie), después el del navegador.
  for (const lang of ["pt", "en", "es"] as const) {
    rules.push({ source: "/", has: [{ type: "cookie", key: COOKIE, value: lang }], destination: home(lang, hotels), permanent: false });
  }
  rules.push({ source: "/", has: [{ type: "header", key: "accept-language", value: "pt.*" }], destination: home("pt", hotels), permanent: false });
  rules.push({ source: "/", has: [{ type: "header", key: "accept-language", value: "en.*" }], destination: home("en", hotels), permanent: false });
  rules.push({ source: "/", destination: home("es", hotels), permanent: false });
  // "/en" y "/pt" solos llevan al hotel de ese idioma.
  rules.push({ source: "/pt", destination: home("pt", hotels), permanent: false });
  rules.push({ source: "/en", destination: home("en", hotels), permanent: false });
  // El español no lleva prefijo: /es/com → /com (la ruta interna no se muestra).
  rules.push({ source: `/es/:hotel${h}`, destination: "/:hotel", permanent: false });
  rules.push({ source: `/es/:hotel${h}/:path*`, destination: "/:hotel/:path*", permanent: false });
  rules.push({ source: "/es/nft", destination: "/nft", permanent: false });
  rules.push({ source: "/es/nft/:path*", destination: "/nft/:path*", permanent: false });
  return rules;
}

/**
 * Ojo: Next aplica estas reglas en orden y cada una ve el resultado de la
 * anterior. Por eso son solo dos (":path*" también cubre "/com" a secas) y la
 * de hoteles va primero: así "/nft" → "/es/nft" ya no vuelve a reescribirse
 * como si "es" fuera un hotel.
 */
export function langRewrites(): { source: string; destination: string }[] {
  return [
    { source: `/:hotel${hotelPattern()}/:path*`, destination: "/es/:hotel/:path*" },
    { source: "/nft/:path*", destination: "/es/nft/:path*" },
  ];
}
