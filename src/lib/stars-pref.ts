"use client";

import { canRememberPrefs } from "./consent";

/**
 * Preferencia "estrellas sí / no". Se guarda en el navegador solo si la persona
 * aceptó las cookies de preferencias; si no, vale hasta que recargue la página.
 */
const KEY = "fm:stars";
const EVENT = "fm:stars-changed";
let sessionValue: boolean | null = null;

export function starsEnabled(): boolean {
  if (sessionValue !== null) return sessionValue;
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setStarsEnabled(on: boolean) {
  sessionValue = on;
  try {
    if (on || !canRememberPrefs()) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, "off");
  } catch {
    // sin almacenamiento: vale solo para esta visita
  }
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeStars(callback: () => void) {
  const onStorage = (e: StorageEvent) => e.key === KEY && callback();
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}
