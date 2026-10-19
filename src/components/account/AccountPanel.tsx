"use client";

import Link from "next/link";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { account, useAccount } from "@/lib/accounts/client";
import { loadRules, useLocal, type LocalRule } from "@/lib/alerts/local";
import { useI18n } from "@/lib/i18n/client";
import { Notice } from "@/components/ui";

const NO_RULES: LocalRule[] = [];
const input = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-text";
const primary = "rounded-lg bg-accent px-4 py-2 font-medium text-accent-ink disabled:opacity-60";

function Field({ label, hint, children }: { label: string; hint?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm text-text-2">
        {label}
      </label>
      {children(id)}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** Entrar, crear cuenta, cambiar contraseña, cerrar sesión y borrar la cuenta. */
export function AccountPanel({ hotel }: { hotel: string }) {
  const { t: ui, href } = useI18n();
  const t = ui.account;
  const { status, name } = useAccount();
  const rules = useLocal(loadRules, NO_RULES);
  const [tab, setTab] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const errorText = (code?: string) => t.errors[code ?? "server"] ?? t.errors.server;

  if (status === "loading") return <div className="skeleton h-64" aria-busy="true" />;
  if (status === "disabled") return <Notice>{t.disabled}</Notice>;
  if (status === "error") return <Notice tone="warn">{t.unreachable}</Notice>;

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) => {
    setBusy(true);
    setError("");
    setNotice("");
    const res = await fn();
    setBusy(false);
    if (!res.ok) setError(errorText(res.error));
    else if (done) setNotice(done);
    return res.ok;
  };

  if (status === "anon") {
    const submit = async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      const username = String(form.get("username") ?? "");
      const password = String(form.get("password") ?? "");
      if (tab === "register" && password !== String(form.get("repeat") ?? "")) return setError(t.mismatch);
      await run(() => (tab === "login" ? account.login(username, password) : account.register(username, password)));
    };
    return (
      <div className="max-w-md space-y-4">
        <p className="text-text-2">{t.why}</p>
        <div className="flex gap-1" role="tablist">
          {(["login", "register"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => (setTab(k), setError(""))}
              className={`rounded-lg px-3 py-1.5 text-sm ${tab === k ? "bg-surface-3 text-text" : "text-text-2 hover:bg-surface-2"}`}
            >
              {k === "login" ? t.loginTab : t.registerTab}
            </button>
          ))}
        </div>
        <form onSubmit={(e) => void submit(e)} className="card space-y-3 p-4" noValidate>
          <Field label={t.username} hint={tab === "register" ? t.usernameHint : undefined}>
            {(id) => <input id={id} name="username" autoComplete="username" required maxLength={20} className={input} />}
          </Field>
          <Field label={t.password} hint={tab === "register" ? t.passwordHint : undefined}>
            {(id) => (
              <input
                id={id}
                name="password"
                type="password"
                autoComplete={tab === "login" ? "current-password" : "new-password"}
                required
                maxLength={128}
                className={input}
              />
            )}
          </Field>
          {tab === "register" && (
            <Field label={t.repeat}>
              {(id) => <input id={id} name="repeat" type="password" autoComplete="new-password" required maxLength={128} className={input} />}
            </Field>
          )}
          {tab === "register" && <Notice tone="warn">{t.warning}</Notice>}
          {error && (
            <p className="text-sm text-down" role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className={primary}>
            {busy ? t.working : tab === "login" ? t.submitLogin : t.submitRegister}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <section className="card space-y-3 p-4">
        <h2 className="font-display text-xl font-bold text-text">{t.signedInAs(name ?? "")}</h2>
        <p className="text-sm text-text-2">{t.synced(rules.length)}</p>
        <div className="flex flex-wrap gap-2">
          <Link prefetch={false} href={href(`/${hotel}/alertas`)} className={primary}>
            {t.goAlerts}
          </Link>
          <button type="button" onClick={() => void run(() => account.logout())} className="rounded-lg border border-line px-4 py-2 text-text hover:bg-surface-2">
            {t.logout}
          </button>
        </div>
      </section>

      {notice && (
        <p className="text-sm text-up" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="text-sm text-down" role="alert">
          {error}
        </p>
      )}

      <form
        className="card space-y-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const formEl = e.currentTarget;
          const form = new FormData(formEl);
          void run(() => account.changePassword(String(form.get("current") ?? ""), String(form.get("next") ?? "")), t.changed).then(
            (ok) => ok && formEl.reset(),
          );
        }}
      >
        <h2 className="font-display text-lg font-bold text-text">{t.changeTitle}</h2>
        <Field label={t.currentPassword}>
          {(id) => <input id={id} name="current" type="password" autoComplete="current-password" required maxLength={128} className={input} />}
        </Field>
        <Field label={t.newPassword} hint={t.passwordHint}>
          {(id) => <input id={id} name="next" type="password" autoComplete="new-password" required maxLength={128} className={input} />}
        </Field>
        <button type="submit" disabled={busy} className={primary}>
          {busy ? t.working : t.changeTitle}
        </button>
      </form>

      <form
        className="card space-y-3 border-down/40 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          void run(() => account.remove(String(form.get("password") ?? "")), t.deleted);
        }}
      >
        <h2 className="font-display text-lg font-bold text-text">{t.deleteTitle}</h2>
        <p className="text-sm text-text-2">{t.deleteText}</p>
        <Field label={t.password}>
          {(id) => <input id={id} name="password" type="password" autoComplete="current-password" required maxLength={128} className={input} />}
        </Field>
        <label className="flex items-center gap-2 text-sm text-text">
          <input type="checkbox" name="confirm" required />
          {t.deleteConfirm}
        </label>
        <button type="submit" disabled={busy} className="rounded-lg bg-down px-4 py-2 font-medium text-[#1a0606] disabled:opacity-60">
          {busy ? t.working : t.deleteSubmit}
        </button>
      </form>
    </div>
  );
}
