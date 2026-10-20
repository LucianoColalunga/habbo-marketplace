"use client";

import { useEffect, useSyncExternalStore, type RefObject } from "react";
import type { HotelCode } from "@/lib/hotels";
import type { FurniType } from "./api";
import { fetchLive, LiveLimitError } from "./live-client";

/**
 * Precios en vivo para las listas (catálogo y rankings). Cada furni que aparece
 * en pantalla se anota; un único proceso junta los anotados y le pregunta a
 * Habbo en lotes, desde el navegador del visitante y dentro del límite de
 * consultas en vivo (ver live-client.ts). Lo que no se pudo consultar sigue
 * mostrando el dato del último escaneo.
 */

export interface LivePrice {
  cp: number;
  oo: number;
  at: number;
}
/** "missing": Habbo no devolvió datos de ese furni (se queda el del escaneo). */
export type LiveEntry = LivePrice | "missing";

export interface LiveStatus {
  state: "idle" | "loading" | "ok" | "limited" | "failed";
  /** Última respuesta de Habbo (ms). */
  at: number | null;
}

const IDLE: LiveStatus = { state: "idle", at: null };
/** Como mucho, cuántos furnis se piden por vuelta (unos 3 pedidos). */
const MAX_PER_RUN = 60;

const entries = new Map<string, LiveEntry>();
const wanted = new Map<string, { hotel: HotelCode; name: string; type: FurniType; refs: number }>();
const listeners = new Set<() => void>();
let status: LiveStatus = IDLE;
let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let again = false;
let forceNext = false;

const keyOf = (hotel: string, name: string) => `${hotel}:${name}`;

function emit() {
  for (const l of listeners) l();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function schedule(delay = 300) {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void run();
  }, delay);
}

async function run() {
  if (running) {
    again = true;
    return;
  }
  const force = forceNext;
  forceNext = false;
  const byHotel = new Map<HotelCode, { name: string; type: FurniType }[]>();
  for (const [key, w] of wanted) {
    if (!force && entries.has(key)) continue;
    const list = byHotel.get(w.hotel) ?? [];
    if (list.length < MAX_PER_RUN) list.push({ name: w.name, type: w.type });
    byHotel.set(w.hotel, list);
  }
  if (byHotel.size === 0) return;
  running = true;
  status = { ...status, state: "loading" };
  emit();

  let state: LiveStatus["state"] = "ok";
  let retryIn = 0;
  let at = status.at;
  for (const [hotel, items] of byHotel) {
    try {
      const res = await fetchLive(hotel, items, { force });
      for (const it of items) {
        const s = res.stats.get(it.name);
        if (s) entries.set(keyOf(hotel, it.name), { cp: s.currentPrice, oo: s.currentOpenOffers, at: res.fetchedAt });
        else if (!res.skipped.includes(it.name)) entries.set(keyOf(hotel, it.name), "missing");
      }
      at = res.fetchedAt;
      if (res.skipped.length > 0) {
        state = "limited";
        retryIn = 15_000;
      }
    } catch (error) {
      if (error instanceof LiveLimitError) {
        state = "limited";
        retryIn = Math.min(Math.max(error.retryInMs, 5_000), 60_000);
      } else if (state !== "limited") {
        state = "failed";
      }
    }
  }
  running = false;
  status = { state, at };
  emit();
  // Si quedaron furnis sin consultar (por el límite o porque se anotaron otros mientras tanto), otra vuelta.
  const pending = [...wanted.keys()].some((k) => !entries.has(k));
  if (again || (pending && state === "ok")) {
    again = false;
    schedule();
  } else if (pending && retryIn > 0) {
    setTimeout(() => schedule(0), retryIn);
  }
}

function want(key: string, hotel: HotelCode, name: string, type: FurniType) {
  const w = wanted.get(key);
  if (w) w.refs++;
  else wanted.set(key, { hotel, name, type, refs: 1 });
  if (!entries.has(key)) schedule();
}

function unwant(key: string) {
  const w = wanted.get(key);
  if (!w) return;
  w.refs--;
  if (w.refs <= 0) wanted.delete(key);
}

/** Vuelve a consultar los furnis que están en pantalla. */
export function refreshLive() {
  if (wanted.size === 0) return;
  forceNext = true;
  schedule(0);
}

/**
 * El precio en vivo de un furni, que se pide recién cuando `ref` está en
 * pantalla (o cerca). Mientras tanto, undefined.
 */
export function useLivePrice(hotel: HotelCode, name: string, type: FurniType, ref: RefObject<Element | null>): LiveEntry | undefined {
  const key = keyOf(hotel, name);
  const entry = useSyncExternalStore(
    subscribe,
    () => entries.get(key),
    () => undefined,
  );
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    let on = false;
    const observer = new IntersectionObserver(
      (list) => {
        const visible = list.some((e) => e.isIntersecting);
        if (visible && !on) {
          on = true;
          want(key, hotel, name, type);
        } else if (!visible && on) {
          on = false;
          unwant(key);
        }
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (on) unwant(key);
    };
  }, [key, hotel, name, type, ref]);
  return entry;
}

export function useLiveStatus(): LiveStatus {
  return useSyncExternalStore(
    subscribe,
    () => status,
    () => IDLE,
  );
}
