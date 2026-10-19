"use client";

/**
 * Consentimiento de cookies. El sitio solo usa almacenamiento necesario (tus
 * alertas, tu sesión si creás una cuenta, el registro de consultas en vivo) y,
 * si aceptás, de preferencias (recordar el idioma y el fondo de estrellas).
 * No hay publicidad ni seguimiento.
 */
const KEY = "bm:consent";
const EVENT = "bm:consent-changed";
const SHOW_EVENT = "bm:consent-show";

export interface Consent {
  v: 1;
  /** Permite guardar preferencias (idioma, estrellas). */
  prefs: boolean;
  at: number;
}

let cachedRaw: string | null | undefined;
let cachedValue: Consent | null = null;

export function readConsent(): Consent | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return null;
  }
  // Mismo objeto mientras no cambie (para useSyncExternalStore).
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  try {
    const parsed = raw ? (JSON.parse(raw) as Partial<Consent>) : null;
    cachedValue = parsed && parsed.v === 1 && typeof parsed.prefs === "boolean" ? { v: 1, prefs: parsed.prefs, at: Number(parsed.at) || 0 } : null;
  } catch {
    cachedValue = null;
  }
  return cachedValue;
}

/** ¿Se pueden guardar preferencias? (solo si la persona aceptó). */
export function canRememberPrefs(): boolean {
  return readConsent()?.prefs === true;
}

export function saveConsent(prefs: boolean) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, prefs, at: Date.now() } satisfies Consent));
    if (!prefs) {
      // Sin permiso, se borran las preferencias guardadas antes.
      localStorage.removeItem("fm:stars");
      document.cookie = "fm_lang=; path=/; max-age=0; samesite=lax";
    }
  } catch {
    // sin almacenamiento: el aviso vuelve a aparecer en la próxima visita
  }
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeConsent(callback: () => void) {
  const onStorage = (e: StorageEvent) => e.key === KEY && callback();
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

/** Vuelve a mostrar el aviso (botón "Cookies" del pie de página). */
export function showConsentBanner() {
  window.dispatchEvent(new Event(SHOW_EVENT));
}

export function onShowConsentBanner(callback: () => void) {
  window.addEventListener(SHOW_EVENT, callback);
  return () => window.removeEventListener(SHOW_EVENT, callback);
}
