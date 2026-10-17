import { LANG_INFO, type Lang } from "@/lib/i18n/config";

/** Palabras de los formatos que dependen del idioma. */
const WORDS: Record<
  Lang,
  { never: string; now: string; min: (n: number) => string; h: (n: number) => string; d: (n: number) => string; pct: string }
> = {
  es: { never: "nunca", now: "recién", min: (n) => `hace ${n} min`, h: (n) => `hace ${n} h`, d: (n) => `hace ${n} días`, pct: " %" },
  pt: { never: "nunca", now: "agora mesmo", min: (n) => `há ${n} min`, h: (n) => `há ${n} h`, d: (n) => `há ${n} dias`, pct: "%" },
  en: { never: "never", now: "just now", min: (n) => `${n} min ago`, h: (n) => `${n} h ago`, d: (n) => `${n} days ago`, pct: "%" },
};

export interface Format {
  lang: Lang;
  int(n: number | null | undefined): string;
  /** Precio en créditos: enteros si es grande, un decimal si es chico (promedios). */
  price(n: number | null | undefined): string;
  compact(n: number | null | undefined): string;
  /** 0.123 -> "+12,3 %" */
  pct(ratio: number | null | undefined, signed?: boolean): string;
  relative(iso: string | null | undefined, now: number): string;
  shortDate(ms: number): string;
  dateTime(iso: string): string;
  /** "sáb, 17 oct" (UTC, para días). */
  day(ms: number): string;
  /** "17 oct, 12:30" (hora local). */
  dayTime(ms: number): string;
  /** Dólares: "US$ 0,29"; montos grandes compactos ("US$ 12,3 mil"). */
  usd(n: number | null | undefined, compact?: boolean): string;
  /** Cantidad de cripto con decimales significativos ("0,000122 ETH"). */
  crypto(amount: number, symbol: string): string;
}

function make(lang: Lang): Format {
  const locale = LANG_INFO[lang].intl;
  const w = WORDS[lang];
  const intFmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const oneDecimal = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const compactFmt = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
  const shortDate = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" });
  const dateTime = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const day = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const usdFmt = new Intl.NumberFormat(locale, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const usdCompact = new Intl.NumberFormat(locale, { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
  const bad = (n: number | null | undefined): n is null | undefined => n === null || n === undefined || !Number.isFinite(n);
  // "17 de out." -> "17 out"; "17 oct." -> "17 oct".
  const tidy = (s: string) => s.replace(/ de /g, " ").replace(/\./g, "");

  return {
    lang,
    int: (n) => (bad(n) ? "—" : intFmt.format(n)),
    price: (n) => (bad(n) ? "—" : n >= 100 ? intFmt.format(Math.round(n)) : oneDecimal.format(n)),
    compact: (n) => (bad(n) ? "—" : Math.abs(n) < 10000 ? intFmt.format(n) : compactFmt.format(n)),
    pct(ratio, signed = true) {
      if (bad(ratio)) return "—";
      const pct = ratio * 100;
      const text = `${oneDecimal.format(Math.abs(pct))}${w.pct}`;
      if (!signed) return text;
      return pct > 0 ? `+${text}` : pct < 0 ? `−${text}` : text;
    },
    relative(iso, now) {
      if (!iso) return w.never;
      const ms = now - Date.parse(iso);
      if (!Number.isFinite(ms)) return "—";
      const min = Math.round(ms / 60000);
      if (min < 1) return w.now;
      if (min < 60) return w.min(min);
      const h = Math.round(min / 60);
      if (h < 48) return w.h(h);
      return w.d(Math.round(h / 24));
    },
    shortDate: (ms) => tidy(shortDate.format(ms)),
    dateTime: (iso) => dateTime.format(new Date(iso)),
    day: (ms) => day.format(ms),
    dayTime: (ms) => dateTime.format(ms),
    usd(n, compact = false) {
      if (bad(n)) return "—";
      if (n > 0 && n < 0.01) return `< ${usdFmt.format(0.01)}`;
      return compact && Math.abs(n) >= 10000 ? usdCompact.format(n) : usdFmt.format(n);
    },
    crypto(amount, symbol) {
      const digits = amount >= 1 ? 2 : amount >= 0.01 ? 4 : 6;
      return `${new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(amount)} ${symbol}`;
    },
  };
}

const cache = new Map<Lang, Format>();

/** Formatos de números y fechas para un idioma (se crean una sola vez). */
export function getFormat(lang: Lang = "es"): Format {
  let f = cache.get(lang);
  if (!f) {
    f = make(lang);
    cache.set(lang, f);
  }
  return f;
}

// Formatos en español para el código del servidor (avisos por Discord/Telegram, scripts).
const es = getFormat("es");
export const formatInt = es.int;
export const formatPrice = es.price;
export const formatCompact = es.compact;
export const formatPct = es.pct;
export const relativeTime = es.relative;
export const formatShortDate = es.shortDate;
export const formatDateTime = es.dateTime;
export const formatUsd = es.usd;
export const formatCrypto = es.crypto;
