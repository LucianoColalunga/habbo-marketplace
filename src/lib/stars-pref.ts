"use client";

/** Preferencia "estrellas sí / no", guardada en este navegador. */
const KEY = "fm:stars";
const EVENT = "fm:stars-changed";

export function starsEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setStarsEnabled(on: boolean) {
  try {
    if (on) localStorage.removeItem(KEY);
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
