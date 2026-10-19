"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { onShowConsentBanner, readConsent, saveConsent, showConsentBanner, subscribeConsent, type Consent } from "@/lib/consent";
import { useI18n } from "@/lib/i18n/client";
import { homeHotel } from "@/lib/i18n/config";

const ON_SERVER = { v: 1, prefs: false, at: 0 } satisfies Consent;

/** Aviso de cookies: aparece hasta que la persona elige; se puede volver a abrir desde el pie. */
export function CookieBanner() {
  const { lang, t, href } = useI18n();
  const consent = useSyncExternalStore(subscribeConsent, readConsent, () => ON_SERVER);
  const [reopened, setReopened] = useState(false);
  useEffect(() => onShowConsentBanner(() => setReopened(true)), []);

  if (consent !== null && !reopened) return null;
  const choose = (prefs: boolean) => {
    saveConsent(prefs);
    setReopened(false);
  };
  return (
    <section
      aria-label={t.cookies.aria}
      className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-line bg-surface-2/95 p-4 shadow-2xl shadow-black/50 backdrop-blur sm:inset-x-auto sm:left-4 sm:max-w-md"
    >
      <p className="text-sm text-text-2">{t.cookies.text}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => choose(true)} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink">
          {t.cookies.accept}
        </button>
        <button type="button" onClick={() => choose(false)} className="rounded-lg border border-line px-3 py-1.5 text-sm text-text hover:bg-surface-3">
          {t.cookies.necessary}
        </button>
        <Link prefetch={false} href={href(`/${homeHotel(lang)}/privacidad`)} className="ml-auto text-sm text-accent hover:underline">
          {t.cookies.more}
        </Link>
      </div>
    </section>
  );
}

/** Botón del pie de página para cambiar la elección. */
export function CookieSettingsButton() {
  const { t } = useI18n();
  return (
    <button type="button" onClick={showConsentBanner} className="hover:text-text">
      {t.cookies.settings}
    </button>
  );
}
