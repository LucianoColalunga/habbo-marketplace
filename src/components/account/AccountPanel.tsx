"use client";

import Link from "next/link";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { account, useAccount } from "@/lib/accounts/client";
import { loadRules, useLocal, type LocalRule } from "@/lib/alerts/local";
import { useI18n } from "@/lib/i18n/client";
import { Notice } from "@/components/ui";

const NO_RULES: LocalRule[] = [];
export const input = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-text";
export const primary = "rounded-lg bg-accent px-4 py-2 font-medium text-accent-ink disabled:opacity-60";
const secondary = "rounded-lg border border-line px-4 py-2 text-text hover:bg-surface-2 disabled:opacity-60";

export function Field({ label, hint, children }: { label: string; hint?: string; children: (id: string) => ReactNode }) {
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

export function Messages({ error, notice }: { error: string; notice: string }) {
  return (
    <>
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
    </>
  );
}

/** Estado común de los formularios: ocupado, error y aviso. */
export function useRunner() {
  const { t: ui } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const errorText = (code?: string) => ui.account.errors[code ?? "server"] ?? ui.account.errors.server;
  const run = async <T extends { ok: boolean; error?: string }>(fn: () => Promise<T>, done?: string | ((res: T) => string)) => {
    setBusy(true);
    setError("");
    setNotice("");
    const res = await fn();
    setBusy(false);
    if (!res.ok) setError(errorText(res.error));
    else if (done) setNotice(typeof done === "string" ? done : done(res));
    return res.ok;
  };
  return { busy, error, notice, setError, setNotice, run };
}

const field = (form: FormData, name: string) => String(form.get(name) ?? "");

/** Entrar, crear cuenta, recuperar, email, contraseña, cerrar sesión y borrar la cuenta. */
export function AccountPanel({ hotel }: { hotel: string }) {
  const { t: ui, href, lang } = useI18n();
  const t = ui.account;
  const { status, name, email, emailVerified, admin, mail } = useAccount();
  const rules = useLocal(loadRules, NO_RULES);
  const [tab, setTab] = useState<"login" | "register" | "forgot">("login");
  const { busy, error, notice, setError, setNotice, run } = useRunner();

  if (status === "loading") return <div className="skeleton h-64" aria-busy="true" />;
  if (status === "disabled") return <Notice>{t.disabled}</Notice>;
  if (status === "error") return <Notice tone="warn">{t.unreachable}</Notice>;

  const sentText = (res: { data?: Record<string, unknown> }, to: string) => (res.data?.verificationSent ? t.verificationSent(to) : "");

  if (status === "anon") {
    const go = (k: typeof tab) => {
      setTab(k);
      setError("");
      setNotice("");
    };
    const submit = async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      if (tab === "forgot") {
        const ok = await run(() => account.forgot(field(form, "email"), lang), t.forgotSent);
        return ok;
      }
      const username = field(form, "username");
      const password = field(form, "password");
      if (tab === "login") return run(() => account.login(username, password));
      if (password !== field(form, "repeat")) return setError(t.mismatch);
      const to = field(form, "email").trim();
      return run(() => account.register(username, to, password, lang), (res) => sentText(res, to));
    };
    return (
      <div className="max-w-md space-y-4">
        <p className="text-text-2">{t.why}</p>
        {tab !== "forgot" ? (
          <div className="flex gap-1" role="tablist">
            {(["login", "register"] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => go(k)}
                className={`rounded-lg px-3 py-1.5 text-sm ${tab === k ? "bg-surface-3 text-text" : "text-text-2 hover:bg-surface-2"}`}
              >
                {k === "login" ? t.loginTab : t.registerTab}
              </button>
            ))}
          </div>
        ) : (
          <h2 className="font-display text-xl font-bold text-text">{t.forgotTitle}</h2>
        )}
        <form key={tab} onSubmit={(e) => void submit(e)} className="card space-y-3 p-4" noValidate>
          {tab === "forgot" ? (
            <>
              <p className="text-sm text-text-2">{t.forgotText}</p>
              {!mail && <Notice tone="warn">{t.forgotOff}</Notice>}
              <Field label={t.email}>
                {(id) => <input id={id} name="email" type="email" autoComplete="email" required maxLength={254} className={input} />}
              </Field>
            </>
          ) : (
            <>
              <Field label={t.username} hint={tab === "register" ? t.usernameHint : undefined}>
                {(id) => <input id={id} name="username" autoComplete="username" required maxLength={20} className={input} />}
              </Field>
              {tab === "register" && (
                <Field label={t.email} hint={t.emailHint}>
                  {(id) => <input id={id} name="email" type="email" autoComplete="email" required maxLength={254} className={input} />}
                </Field>
              )}
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
            </>
          )}
          <Messages error={error} notice={notice} />
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={busy || (tab === "forgot" && !mail)} className={primary}>
              {busy ? t.working : tab === "login" ? t.submitLogin : tab === "register" ? t.submitRegister : t.forgotSubmit}
            </button>
            {tab === "login" && (
              <button type="button" onClick={() => go("forgot")} className="text-sm text-accent hover:underline">
                {t.forgotLink}
              </button>
            )}
            {tab === "forgot" && (
              <button type="button" onClick={() => go("login")} className="text-sm text-accent hover:underline">
                {t.backToLogin}
              </button>
            )}
          </div>
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
          {admin && (
            <Link prefetch={false} href={href(`/${hotel}/admin`)} className={secondary}>
              {t.adminLink}
            </Link>
          )}
          <button type="button" onClick={() => void run(() => account.logout())} className={secondary}>
            {t.logout}
          </button>
        </div>
      </section>

      <Messages error={error} notice={notice} />

      {email && !emailVerified && mail && (
        <Notice tone="warn">
          <span className="block">{t.verifyBanner}</span>
          <button type="button" disabled={busy} onClick={() => void run(() => account.resend(lang), t.resendSent)} className="mt-2 text-accent hover:underline">
            {t.resend}
          </button>
        </Notice>
      )}
      {!email && <Notice tone="warn">{t.emailMissing}</Notice>}

      <form
        className="card space-y-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const formEl = e.currentTarget;
          const form = new FormData(formEl);
          const to = field(form, "email").trim();
          void run(() => account.changeEmail(field(form, "password"), to, lang), (res) => sentText(res, to)).then(
            (ok) => ok && formEl.reset(),
          );
        }}
      >
        <h2 className="font-display text-lg font-bold text-text">{email ? t.emailTitle : t.addEmailTitle}</h2>
        {email && (
          <p className="flex flex-wrap items-center gap-2 text-sm text-text">
            <span className="break-all">{email}</span>
            <span className={`rounded px-1.5 py-0.5 text-xs ${emailVerified ? "bg-up/15 text-up" : "bg-accent/15 text-accent"}`}>
              {emailVerified ? t.emailVerified : t.emailUnverified}
            </span>
          </p>
        )}
        <Field label={email ? t.newEmail : t.email} hint={t.emailHint}>
          {(id) => <input id={id} name="email" type="email" autoComplete="email" required maxLength={254} className={input} />}
        </Field>
        <Field label={t.currentPassword}>
          {(id) => <input id={id} name="password" type="password" autoComplete="current-password" required maxLength={128} className={input} />}
        </Field>
        <button type="submit" disabled={busy} className={primary}>
          {busy ? t.working : t.changeEmailSubmit}
        </button>
      </form>

      <form
        className="card space-y-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const formEl = e.currentTarget;
          const form = new FormData(formEl);
          void run(() => account.changePassword(field(form, "current"), field(form, "next")), t.changed).then((ok) => ok && formEl.reset());
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
          void run(() => account.remove(field(form, "password")), t.deleted);
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
