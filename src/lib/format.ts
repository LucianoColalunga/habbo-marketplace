const intFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });
const compactFmt = new Intl.NumberFormat("es-AR", { notation: "compact", maximumFractionDigits: 1 });

export function formatInt(n: number | null | undefined): string {
  return n === null || n === undefined || !Number.isFinite(n) ? "—" : intFmt.format(n);
}

/** Precio en créditos: enteros si es grande, un decimal si es chico (promedios). */
export function formatPrice(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return n >= 100 ? intFmt.format(Math.round(n)) : oneDecimal.format(n);
}

export function formatCompact(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return Math.abs(n) < 10000 ? intFmt.format(n) : compactFmt.format(n);
}

/** 0.123 -> "+12,3 %" */
export function formatPct(ratio: number | null | undefined, signed = true): string {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return "—";
  const pct = ratio * 100;
  const text = `${oneDecimal.format(Math.abs(pct))} %`;
  if (!signed) return text;
  return pct > 0 ? `+${text}` : pct < 0 ? `−${text}` : text;
}

export function relativeTime(iso: string | null | undefined, now: number): string {
  if (!iso) return "nunca";
  const ms = now - Date.parse(iso);
  if (!Number.isFinite(ms)) return "—";
  const min = Math.round(ms / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} días`;
}

const shortDate = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", timeZone: "UTC" });
const dateTime = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatShortDate(ms: number): string {
  return shortDate.format(ms).replace(".", "");
}

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}
