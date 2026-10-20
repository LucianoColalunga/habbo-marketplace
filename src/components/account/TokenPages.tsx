"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { account } from "@/lib/accounts/client";
import { useI18n } from "@/lib/i18n/client";
import { Notice } from "@/components/ui";
import { Field, input, Messages, primary, useRunner } from "./AccountPanel";

/**
 * Páginas que abren los enlaces de los correos. El token se lee una sola vez
 * y se saca enseguida de la dirección (para que no quede en el historial ni
 * se comparta por error).
 */
let captured: string | null | undefined;

function readToken(): string | null {
  if (captured === undefined) {
    const token = new URLSearchParams(window.location.search).get("token");
    captured = token && /^[A-Za-z0-9_-]{20,100}$/.test(token) ? token : null;
  }
  return captured;
}

const noop = () => () => {};

function useToken(): string | null | undefined {
  // En el servidor (y al hidratar) todavía no se sabe: undefined.
  const token = useSyncExternalStore(noop, readToken, () => undefined);
  useEffect(() => {
    if (window.location.search) window.history.replaceState(window.history.state, "", window.location.pathname);
  }, []);
  return token;
}

/** Un mismo enlace se confirma una sola vez aunque el efecto corra dos veces. */
const verifying = new Map<string, ReturnType<typeof account.verify>>();

export function VerifyEmail({ hotel }: { hotel: string }) {
  const { t: ui, href } = useI18n();
  const t = ui.account;
  const token = useToken();
  const [result, setResult] = useState<"ok" | "bad" | null>(null);

  useEffect(() => {
    if (!token) return;
    if (!verifying.has(token)) verifying.set(token, account.verify(token));
    void verifying.get(token)!.then((res) => setResult(res.ok ? "ok" : "bad"));
  }, [token]);

  if (token === undefined) return <div className="skeleton h-24" aria-busy="true" />;
  if (token === null) return <Notice tone="warn">{t.noToken}</Notice>;
  return (
    <div className="max-w-md space-y-4">
      {result === null && <p className="text-text-2" aria-busy="true">{t.verifying}</p>}
      {result === "ok" && (
        <p className="text-up" role="status">
          {t.verifyOk}
        </p>
      )}
      {result === "bad" && <Notice tone="warn">{t.verifyBad}</Notice>}
      {result !== null && (
        <Link prefetch={false} href={href(`/${hotel}/cuenta`)} className={`inline-block ${primary}`}>
          {t.goAccount}
        </Link>
      )}
    </div>
  );
}

export function ResetPassword({ hotel }: { hotel: string }) {
  const { t: ui, href } = useI18n();
  const t = ui.account;
  const token = useToken();
  const { busy, error, notice, setError, run } = useRunner();
  const [done, setDone] = useState(false);

  if (token === undefined) return <div className="skeleton h-48" aria-busy="true" />;
  if (token === null) return <Notice tone="warn">{t.noToken}</Notice>;
  return (
    <form
      className="card max-w-md space-y-3 p-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const password = String(form.get("password") ?? "");
        if (password !== String(form.get("repeat") ?? "")) return setError(t.mismatch);
        void run(
          () => account.reset(token, password),
          (res) => t.resetOk(String((res.data?.user as { name?: unknown } | undefined)?.name ?? "")),
        ).then((ok) => ok && setDone(true));
      }}
    >
      {!done && (
        <>
          <p className="text-sm text-text-2">{t.resetText}</p>
          <Field label={t.newPassword} hint={t.passwordHint}>
            {(id) => <input id={id} name="password" type="password" autoComplete="new-password" required maxLength={128} className={input} />}
          </Field>
          <Field label={t.repeat}>
            {(id) => <input id={id} name="repeat" type="password" autoComplete="new-password" required maxLength={128} className={input} />}
          </Field>
        </>
      )}
      <Messages error={error === ui.account.errors.invalid_token ? t.resetBad : error} notice={notice} />
      {done ? (
        <Link prefetch={false} href={href(`/${hotel}/cuenta`)} className={`inline-block ${primary}`}>
          {t.goAccount}
        </Link>
      ) : (
        <button type="submit" disabled={busy} className={primary}>
          {busy ? t.working : t.resetSubmit}
        </button>
      )}
    </form>
  );
}
