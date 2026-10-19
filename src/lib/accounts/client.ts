"use client";

import { useEffect, useSyncExternalStore } from "react";
import { loadRules, saveRules, type LocalRule } from "@/lib/alerts/local";
import { parseStoredRules } from "@/lib/alerts/rules";

/**
 * Cuenta en el navegador: quién está conectado y la sincronización de la lista
 * de alertas. La lista sigue viviendo en el navegador (así funciona igual sin
 * conexión); con una cuenta, además se sube y se baja del servidor.
 *  - La primera vez que una cuenta entra en un dispositivo, se juntan las dos listas.
 *  - Después manda el servidor, salvo que haya cambios locales sin subir.
 */
export type AccountStatus = "loading" | "disabled" | "anon" | "user" | "error";
export interface AccountState {
  status: AccountStatus;
  name: string | null;
}

const MARKER = "bm:account";
const DIRTY = "bm:rules-dirty";
const SERVER_STATE: AccountState = { status: "loading", name: null };

let state: AccountState = SERVER_STATE;
const listeners = new Set<() => void>();
let started = false;
let uploadTimer: ReturnType<typeof setTimeout> | null = null;

function setState(next: AccountState) {
  state = next;
  for (const l of listeners) l();
}

function storage(key: string, value?: string | null): string | null {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // sin almacenamiento
  }
  return null;
}

async function call(method: "POST" | "PUT", action: string, body: unknown): Promise<{ ok: boolean; error?: string; data?: Record<string, unknown> }> {
  try {
    const res = await fetch(`/api/account/${action}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.status === 401) setState({ status: "anon", name: null });
    return res.ok ? { ok: true, data } : { ok: false, error: typeof data.error === "string" ? data.error : "server" };
  } catch {
    return { ok: false, error: "server" };
  }
}

/** Misma alerta (aunque tenga otro id): mismo hotel, furni, tipo y valor. */
function sameRule(a: LocalRule, b: LocalRule) {
  return a.id === b.id || (a.hotel === b.hotel && a.item === b.item && a.mode === b.mode && a.value === b.value);
}

async function upload(rules: LocalRule[]) {
  const res = await call("PUT", "rules", { rules });
  if (res.ok) storage(DIRTY, null);
}

/** Aplica la lista que vino de la cuenta según las reglas de arriba. */
function applyAccountRules(name: string, raw: unknown) {
  const u = name.toLowerCase();
  const server = parseStoredRules(raw);
  const local = loadRules();
  if (storage(MARKER) !== u) {
    const merged = [...server, ...local.filter((l) => !server.some((s) => sameRule(s, l)))].slice(0, 100);
    saveRules(merged, true);
    storage(MARKER, u);
    if (merged.length !== server.length) void upload(merged);
  } else if (storage(DIRTY)) {
    void upload(local);
  } else {
    saveRules(server, true);
  }
}

async function start() {
  if (started) return;
  started = true;
  // Cambios en la lista local: si hay sesión, se suben (con una pequeña espera para juntar varios).
  window.addEventListener("fm:alerts-changed", (e) => {
    const detail = (e as CustomEvent<{ rules?: boolean; fromAccount?: boolean } | null>).detail;
    if (!detail?.rules || detail.fromAccount || state.status !== "user") return;
    storage(DIRTY, "1");
    if (uploadTimer) clearTimeout(uploadTimer);
    uploadTimer = setTimeout(() => void upload(loadRules()), 800);
  });
  try {
    const res = await fetch("/api/account/me", { credentials: "same-origin", cache: "no-store" });
    const body = (await res.json()) as { enabled?: boolean; user?: { name?: string } | null; rules?: unknown };
    if (!body.enabled) return setState({ status: "disabled", name: null });
    const name = body.user?.name;
    if (!name) return setState({ status: "anon", name: null });
    applyAccountRules(name, body.rules);
    setState({ status: "user", name });
  } catch {
    setState({ status: "error", name: null });
  }
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function useAccount(): AccountState {
  const value = useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
  useEffect(() => void start(), []);
  return value;
}

async function enter(action: "login" | "register", username: string, password: string) {
  const res = await call("POST", action, { username, password });
  if (res.ok && res.data?.user && typeof (res.data.user as { name?: unknown }).name === "string") {
    const name = (res.data.user as { name: string }).name;
    applyAccountRules(name, res.data.rules);
    setState({ status: "user", name });
  }
  return res;
}

export const account = {
  login: (username: string, password: string) => enter("login", username, password),
  register: (username: string, password: string) => enter("register", username, password),
  async logout() {
    const res = await call("POST", "logout", {});
    storage(MARKER, null);
    storage(DIRTY, null);
    setState({ status: "anon", name: null });
    return res;
  },
  changePassword: (current: string, next: string) => call("POST", "password", { current, next }),
  async remove(password: string) {
    const res = await call("POST", "delete", { password });
    if (res.ok) {
      storage(MARKER, null);
      storage(DIRTY, null);
      setState({ status: "anon", name: null });
    }
    return res;
  },
};
