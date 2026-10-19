"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { canRememberPrefs } from "@/lib/consent";
import { useI18n } from "@/lib/i18n/client";
import { LANG_COOKIE, LANG_INFO, LANGS, localePath, splitLocale, type Lang } from "@/lib/i18n/config";

/** Recuerda el idioma elegido para la próxima vez que se entre por la portada (solo con permiso). */
function remember(lang: Lang) {
  if (!canRememberPrefs()) return;
  const secure = location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax${secure}`;
}

/** ES · PT · EN: lleva a la misma página en otro idioma. */
export function LanguageSwitcher() {
  const { lang, t } = useI18n();
  const { rest } = splitLocale(usePathname() ?? "/");
  return (
    <nav aria-label={t.lang.aria} className="inline-flex rounded-lg border border-line bg-surface p-0.5 text-xs font-semibold">
      {LANGS.map((code) => (
        <Link
          prefetch={false}
          key={code}
          href={localePath(code, rest)}
          hrefLang={LANG_INFO[code].html}
          lang={LANG_INFO[code].html}
          title={LANG_INFO[code].label}
          aria-current={code === lang ? "true" : undefined}
          onClick={() => remember(code)}
          className={`rounded-md px-2 py-1 transition-colors ${code === lang ? "bg-surface-3 text-text" : "text-text-2 hover:text-text"}`}
        >
          <span aria-hidden="true">{LANG_INFO[code].short}</span>
          <span className="sr-only">{LANG_INFO[code].label}</span>
        </Link>
      ))}
    </nav>
  );
}
