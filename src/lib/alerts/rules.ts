import { isSafeClassname } from "@/lib/habbo/api";
import { isHotelCode, type HotelCode } from "@/lib/hotels";

/**
 * Reglas de alerta. Se usan igual en el navegador (lista guardada en el equipo)
 * y en el servidor (variable ALERTS_RULES).
 *
 * Importante: la API de Habbo no muestra cada publicación por separado, solo el
 * precio mínimo publicado y la cantidad de ofertas en el momento de la consulta.
 * Una alerta significa "en el último chequeo, el precio mínimo estaba por debajo
 * del umbral". Si alguien publica barato y otro lo compra entre dos chequeos, no
 * se detecta.
 */

export type RuleMode = "below_avg" | "below_price";

export interface WatchRule {
  id: string;
  hotel: HotelCode;
  /** classname del furni. */
  item: string;
  /** below_avg: value = % por debajo del promedio reciente. below_price: value = precio en créditos. */
  mode: RuleMode;
  value: number;
}

export interface PriceSnapshot {
  /** Precio mínimo publicado (0 = sin ofertas). */
  cp: number;
  /** Ofertas abiertas. */
  oo: number;
  /** Precio de referencia (promedio reciente) o null si no hay ventas suficientes. */
  ref: number | null;
}

export interface RuleCheck {
  rule: WatchRule;
  triggered: boolean;
  price: number;
  offers: number;
  threshold: number | null;
  ref: number | null;
  /** Cuánto por debajo del promedio está el precio mínimo (0.25 = 25 %). */
  belowRef: number | null;
}

export function thresholdFor(rule: WatchRule, ref: number | null): number | null {
  if (rule.mode === "below_price") return rule.value;
  if (ref === null || ref <= 0) return null;
  return ref * (1 - rule.value / 100);
}

export function evaluateRule(rule: WatchRule, snap: PriceSnapshot): RuleCheck {
  const threshold = thresholdFor(rule, snap.ref);
  const hasOffer = snap.oo > 0 && snap.cp > 0;
  return {
    rule,
    triggered: hasOffer && threshold !== null && snap.cp <= threshold,
    price: snap.cp,
    offers: snap.oo,
    threshold,
    ref: snap.ref,
    belowRef: hasOffer && snap.ref ? (snap.ref - snap.cp) / snap.ref : null,
  };
}

export interface NotifyState {
  active: boolean;
  price: number;
  at: number;
}

/**
 * Evita repetir avisos: se avisa cuando la condición empieza a cumplirse o cuando
 * el precio baja todavía más que en el último aviso.
 */
export function shouldNotify(check: RuleCheck, previous: NotifyState | undefined, now: number) {
  if (!check.triggered) {
    return { notify: false, next: { active: false, price: 0, at: previous?.at ?? now } satisfies NotifyState };
  }
  const notify = !previous || !previous.active || check.price < previous.price;
  return {
    notify,
    next: { active: true, price: notify ? check.price : previous!.price, at: notify ? now : previous!.at } satisfies NotifyState,
  };
}

let counter = 0;
export function newRuleId(): string {
  counter = (counter + 1) % 1000;
  return `${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Valida una regla que viene de un lugar no confiable (JSON del usuario, almacenamiento local). */
export function parseRule(raw: unknown): WatchRule | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isHotelCode(r.hotel)) return null;
  if (!isSafeClassname(r.item)) return null;
  if (r.mode !== "below_avg" && r.mode !== "below_price") return null;
  const value = Number(r.value);
  if (!Number.isFinite(value) || value <= 0) return null;
  if (r.mode === "below_avg" && value >= 100) return null;
  const id = typeof r.id === "string" && /^[\w-]{1,40}$/.test(r.id) ? r.id : `${r.hotel}-${r.item}-${r.mode}-${value}`;
  return { id, hotel: r.hotel, item: r.item, mode: r.mode, value: Math.round(value * 100) / 100 };
}

export function parseRules(raw: unknown): WatchRule[] {
  if (!Array.isArray(raw)) return [];
  const out: WatchRule[] = [];
  const ids = new Set<string>();
  for (const r of raw) {
    const rule = parseRule(r);
    if (rule && !ids.has(rule.id)) {
      ids.add(rule.id);
      out.push(rule);
    }
  }
  return out;
}

export function describeRule(rule: WatchRule): string {
  return rule.mode === "below_avg"
    ? `${rule.value} % o más por debajo del promedio`
    : `a ${rule.value} créditos o menos`;
}

/** Regla guardada (en el navegador o en la cuenta), con los datos del furni para mostrarla. */
export interface StoredRule extends WatchRule {
  name: string;
  t: "r" | "w";
  r: number;
  createdAt: number;
}

/** Cuántas alertas puede tener una lista. */
export const MAX_RULES = 100;

/** Valida una regla guardada que viene de un lugar no confiable. */
export function parseStoredRule(raw: unknown): StoredRule | null {
  const rule = parseRule(raw);
  if (!rule) return null;
  const extra = raw as Partial<StoredRule>;
  return {
    ...rule,
    // Sin caracteres de control: el nombre solo se muestra como texto.
    name: typeof extra.name === "string" ? extra.name.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 120) : rule.item,
    t: extra.t === "w" ? "w" : "r",
    r: Number.isFinite(extra.r) ? Math.max(0, Math.trunc(Number(extra.r))) : 0,
    createdAt: Number.isFinite(extra.createdAt) ? Number(extra.createdAt) : Date.now(),
  };
}

export function parseStoredRules(raw: unknown): StoredRule[] {
  if (!Array.isArray(raw)) return [];
  const out: StoredRule[] = [];
  const ids = new Set<string>();
  for (const r of raw) {
    const rule = parseStoredRule(r);
    if (rule && !ids.has(rule.id)) {
      ids.add(rule.id);
      out.push(rule);
    }
    if (out.length >= MAX_RULES) break;
  }
  return out;
}
