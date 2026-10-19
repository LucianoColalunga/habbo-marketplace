"use client";

import { useSyncExternalStore } from "react";
import { isHotelCode } from "@/lib/hotels";
import { parseStoredRules, type NotifyState, type StoredRule } from "./rules";

/**
 * Lista de vigilancia guardada en el navegador (localStorage). Queda aunque se
 * cierre la pestaña o se apague la PC. Con una cuenta, además se sincroniza
 * con el servidor (ver lib/accounts/client.ts).
 */

export type LocalRule = StoredRule;

export interface Detection {
  id: string;
  ruleId: string;
  hotel: string;
  item: string;
  name: string;
  price: number;
  ref: number | null;
  belowRef: number | null;
  offers: number;
  at: number;
}

export interface LastCheck {
  cp: number;
  oo: number;
  ref: number | null;
  triggered: boolean;
  at: number;
}

export interface AlertSettings {
  intervalMin: number;
  notifications: boolean;
}

const KEYS = {
  rules: "fm:rules",
  detections: "fm:detections",
  state: "fm:notify-state",
  last: "fm:last-checks",
  settings: "fm:settings",
  lastRun: "fm:last-run",
};

const EVENT = "fm:alerts-changed";
export const DEFAULT_SETTINGS: AlertSettings = { intervalMin: 5, notifications: false };

function read<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // almacenamiento lleno o bloqueado: no se guarda
  }
  window.dispatchEvent(new Event(EVENT));
}

export function loadRules(): LocalRule[] {
  return parseStoredRules(read<unknown>(KEYS.rules, []));
}

/** Guarda la lista. `fromAccount` indica que viene de la cuenta (no hay que volver a subirla). */
export function saveRules(rules: LocalRule[], fromAccount = false) {
  try {
    localStorage.setItem(KEYS.rules, JSON.stringify(rules));
  } catch {
    // almacenamiento lleno o bloqueado: no se guarda
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { rules: true, fromAccount } }));
}

export function addRule(rule: LocalRule) {
  const rules = loadRules().filter((r) => r.id !== rule.id);
  saveRules([...rules, rule]);
  // Una regla nueva se revisa enseguida, sin esperar al próximo intervalo.
  requestCheckNow();
}

export function removeRule(id: string) {
  saveRules(loadRules().filter((r) => r.id !== id));
  const state = loadNotifyState();
  delete state[id];
  write(KEYS.state, state);
}

export function loadDetections(): Detection[] {
  const list = read<Detection[]>(KEYS.detections, []);
  return Array.isArray(list) ? list.filter((d) => d && isHotelCode(d.hotel)) : [];
}

export function addDetections(list: Detection[]) {
  if (list.length === 0) return;
  write(KEYS.detections, [...list, ...loadDetections()].slice(0, 100));
}

export function clearDetections() {
  write(KEYS.detections, []);
}

export function loadNotifyState(): Record<string, NotifyState> {
  return read<Record<string, NotifyState>>(KEYS.state, {});
}

export function saveNotifyState(state: Record<string, NotifyState>) {
  write(KEYS.state, state);
}

export function loadLastChecks(): Record<string, LastCheck> {
  return read<Record<string, LastCheck>>(KEYS.last, {});
}

export function saveLastChecks(last: Record<string, LastCheck>) {
  write(KEYS.last, last);
}

export function loadSettings(): AlertSettings {
  const s = read<Partial<AlertSettings>>(KEYS.settings, {});
  const interval = Number(s.intervalMin);
  return {
    intervalMin: [2, 5, 10, 15, 30].includes(interval) ? interval : DEFAULT_SETTINGS.intervalMin,
    notifications: s.notifications === true,
  };
}

export function saveSettings(settings: AlertSettings) {
  write(KEYS.settings, settings);
}

export function loadLastRun(): number {
  return read<number>(KEYS.lastRun, 0);
}

export function saveLastRun(at: number) {
  write(KEYS.lastRun, at);
}

/** Pide un chequeo inmediato al vigilante. */
export function requestCheckNow() {
  window.dispatchEvent(new Event("fm:check-now"));
}

function subscribe(callback: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key.startsWith("fm:")) callback();
  };
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

/** Lee un valor del almacenamiento local y se actualiza cuando cambia (también desde otra pestaña). */
export function useLocal<T>(loader: () => T, serverValue: T): T {
  const cache = snapshotOf(loader);
  return useSyncExternalStore(subscribe, cache, () => serverValue);
}

// useSyncExternalStore necesita la misma referencia mientras el dato no cambie.
const snapshotCaches = new WeakMap<() => unknown, { json: string; value: unknown }>();
function snapshotOf<T>(loader: () => T): () => T {
  return () => {
    const value = loader();
    const json = JSON.stringify(value);
    const hit = snapshotCaches.get(loader);
    if (hit && hit.json === json) return hit.value as T;
    snapshotCaches.set(loader, { json, value });
    return value;
  };
}
