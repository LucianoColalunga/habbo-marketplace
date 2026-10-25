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
  email: string | null;
  emailVerified: boolean;
  admin: boolean;
  /** Plan de la cuenta (sin cuenta: standard). */
  plan: "standard" | "vip";
  /** Si el sitio puede mandar correos (confirmar y recuperar). */
  mail: boolean;
}

interface PublicUser {
  name: string;
  email: string | null;
  emailVerified: boolean;
  admin: boolean;
  plan: "standard" | "vip";
}

const MARKER = "bm:account";
const DIRTY = "bm:rules-dirty";
const SERVER_STATE: AccountState = { status: "loading", name: null, email: null, emailVerified: false, admin: false, plan: "standard", mail: false };

let state: AccountState = SERVER_STATE;
const listeners = new Set<() => void>();
let started = false;
let uploadTimer: ReturnType<typeof setTimeout> | null = null;

function setState(next: Partial<AccountState>) {
  state = { ...state, ...next };
  for (const l of listeners) l();
}

const SIGNED_OUT = { name: null, email: null, emailVerified: false, admin: false, plan: "standard" } as const;

function asUser(raw: unknown): PublicUser | null {
  const u = raw as Partial<PublicUser> | null | undefined;
  if (!u || typeof u.name !== "string") return null;
  return {
    name: u.name,
    email: typeof u.email === "string" ? u.email : null,
    emailVerified: u.emailVerified === true,
    admin: u.admin === true,
    plan: u.plan === "vip" ? "vip" : "standard",
  };
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
    if (res.status === 401) setState({ status: "anon", ...SIGNED_OUT });
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
    // Si nunca se entró a una cuenta en este navegador, alcanza con saber si hay
    // cuentas (respuesta igual para todos, guardada en el CDN: no gasta la base).
    if (!storage(MARKER)) {
      const cfg = (await (await fetch("/api/account/config", { credentials: "omit" })).json()) as { enabled?: boolean; mail?: boolean };
      return setState({ status: cfg.enabled ? "anon" : "disabled", mail: cfg.mail === true, ...SIGNED_OUT });
    }
    const res = await fetch("/api/account/me", { credentials: "same-origin", cache: "no-store" });
    const body = (await res.json()) as { enabled?: boolean; mail?: boolean; user?: unknown; rules?: unknown };
    if (!body.enabled) return setState({ status: "disabled", ...SIGNED_OUT });
    const mail = body.mail === true;
    const user = asUser(body.user);
    if (!user) return setState({ status: "anon", mail, ...SIGNED_OUT });
    applyAccountRules(user.name, body.rules);
    setState({ status: "user", mail, ...user });
  } catch {
    setState({ status: "error", ...SIGNED_OUT });
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

/** Respuesta que deja la sesión abierta (entrar, crear cuenta o contraseña nueva por email). */
async function enter(action: "login" | "register" | "reset", body: Record<string, unknown>) {
  const res = await call("POST", action, body);
  const user = res.ok ? asUser(res.data?.user) : null;
  if (user) {
    applyAccountRules(user.name, res.data?.rules);
    setState({ status: "user", ...user });
  }
  return res;
}

function signedOut() {
  storage(MARKER, null);
  storage(DIRTY, null);
  setState({ status: "anon", ...SIGNED_OUT });
}

export const account = {
  login: (username: string, password: string) => enter("login", { username, password }),
  register: (username: string, email: string, password: string, lang: string) => enter("register", { username, email, password, lang }),
  /** Contraseña nueva con el enlace del correo; deja la sesión abierta. */
  reset: (token: string, password: string) => enter("reset", { token, password }),
  forgot: (email: string, lang: string) => call("POST", "forgot", { email, lang }),
  async verify(token: string) {
    const res = await call("POST", "verify", { token });
    if (res.ok && state.status === "user") setState({ emailVerified: true });
    return res;
  },
  resend: (lang: string) => call("POST", "resend", { lang }),
  async changeEmail(password: string, email: string, lang: string) {
    const res = await call("POST", "email", { password, email, lang });
    const user = res.ok ? asUser(res.data?.user) : null;
    if (user) setState(user);
    return res;
  },
  async logout() {
    const res = await call("POST", "logout", {});
    signedOut();
    return res;
  },
  changePassword: (current: string, next: string) => call("POST", "password", { current, next }),
  async remove(password: string) {
    const res = await call("POST", "delete", { password });
    if (res.ok) signedOut();
    return res;
  },
};
