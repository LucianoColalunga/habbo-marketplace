"use client";

import { canRememberPrefs } from "./consent";

/**
 * Cómo se ve el catálogo: imágenes grandes, medianas, chicas o lista. Se guarda
 * en el navegador solo si la persona aceptó las cookies de preferencias; si no,
 * vale hasta que recargue la página.
 */
export type CatalogView = "big" | "medium" | "small" | "list";
export const CATALOG_VIEWS: CatalogView[] = ["big", "medium", "small", "list"];
export const DEFAULT_VIEW: CatalogView = "medium";

const KEY = "bm:catalog-view";
const EVENT = "bm:catalog-view-changed";
let sessionValue: CatalogView | null = null;

const isView = (v: unknown): v is CatalogView => CATALOG_VIEWS.includes(v as CatalogView);

export function catalogView(): CatalogView {
  if (sessionValue) return sessionValue;
  try {
    const saved = localStorage.getItem(KEY);
    return isView(saved) ? saved : DEFAULT_VIEW;
  } catch {
    return DEFAULT_VIEW;
  }
}

export function setCatalogView(view: CatalogView) {
  sessionValue = view;
  try {
    if (canRememberPrefs() && view !== DEFAULT_VIEW) localStorage.setItem(KEY, view);
    else localStorage.removeItem(KEY);
  } catch {
    // sin almacenamiento: vale solo para esta visita
  }
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeCatalogView(callback: () => void) {
  const onStorage = (e: StorageEvent) => e.key === KEY && callback();
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}
