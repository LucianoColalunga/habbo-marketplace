/**
 * Hoteles de Habbo. Cada hotel tiene su propia economía: los precios de un
 * hotel no se mezclan con los de otro.
 */
export const HOTELS = {
  es: { code: "es", domain: "www.habbo.es", label: ".es", region: "España", lang: "es" },
  com: { code: "com", domain: "www.habbo.com", label: ".com", region: "Internacional", lang: "en" },
  br: { code: "br", domain: "www.habbo.com.br", label: ".com.br", region: "Brasil", lang: "pt" },
  de: { code: "de", domain: "www.habbo.de", label: ".de", region: "Alemania", lang: "de" },
  fr: { code: "fr", domain: "www.habbo.fr", label: ".fr", region: "Francia", lang: "fr" },
  it: { code: "it", domain: "www.habbo.it", label: ".it", region: "Italia", lang: "it" },
  nl: { code: "nl", domain: "www.habbo.nl", label: ".nl", region: "Países Bajos", lang: "nl" },
  fi: { code: "fi", domain: "www.habbo.fi", label: ".fi", region: "Finlandia", lang: "fi" },
  tr: { code: "tr", domain: "www.habbo.com.tr", label: ".com.tr", region: "Turquía", lang: "tr" },
} as const;

export type HotelCode = keyof typeof HOTELS;
export type Hotel = (typeof HOTELS)[HotelCode];

export const DEFAULT_HOTELS: HotelCode[] = ["es", "com", "br"];

export function isHotelCode(value: unknown): value is HotelCode {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(HOTELS, value);
}

/** Lista de hoteles habilitados a partir de un texto como "es,com,br". */
export function parseHotelList(raw: string | undefined | null): HotelCode[] {
  if (!raw) return [...DEFAULT_HOTELS];
  const list = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(isHotelCode);
  const unique = [...new Set(list)];
  return unique.length > 0 ? unique : [...DEFAULT_HOTELS];
}

/** Hoteles que la web muestra y escanea (variable NEXT_PUBLIC_HOTELS). */
export function enabledHotels(): HotelCode[] {
  return parseHotelList(process.env.NEXT_PUBLIC_HOTELS);
}

export function defaultHotel(): HotelCode {
  return enabledHotels()[0];
}

export function isEnabledHotel(value: unknown): value is HotelCode {
  return isHotelCode(value) && enabledHotels().includes(value);
}

export function hotelBaseUrl(code: HotelCode): string {
  return `https://${HOTELS[code].domain}`;
}
