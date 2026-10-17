"use client";

import { useSyncExternalStore } from "react";

/**
 * Hora actual compartida por todos los componentes, redondeada a 30 s.
 * En el servidor devuelve null (la hora se calcula recién en el navegador).
 */
const STEP = 30_000;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(callback: () => void) {
  listeners.add(callback);
  timer ??= setInterval(() => listeners.forEach((l) => l()), STEP);
  return () => {
    listeners.delete(callback);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const getSnapshot = () => Math.floor(Date.now() / STEP) * STEP;
const getServerSnapshot = () => null;

export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
