"use client";

import Link from "next/link";
import { useAccount } from "@/lib/accounts/client";
import { useI18n } from "@/lib/i18n/client";
import { homeHotel } from "@/lib/i18n/config";
import { VipBadge } from "@/components/plans/YourPlan";

/** "Entrar" o el nombre de la cuenta, en el encabezado. No aparece si las cuentas están apagadas. */
export function AccountButton({ hotel }: { hotel?: string }) {
  const { lang, t, href } = useI18n();
  const { status, name, plan } = useAccount();
  if (status !== "anon" && status !== "user") return null;
  const to = href(`/${hotel ?? homeHotel(lang)}/cuenta`);
  return (
    <Link
      prefetch={false}
      href={to}
      className="inline-flex max-w-36 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-text hover:bg-surface-2"
      title={status === "user" ? t.account.myAccount : undefined}
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-accent" aria-hidden="true">
        <circle cx="10" cy="7" r="3.5" fill="currentColor" />
        <path d="M3 17.5c.8-3.3 3.6-5 7-5s6.2 1.7 7 5" fill="currentColor" />
      </svg>
      <span className="truncate">{status === "user" ? name : t.account.enter}</span>
      {status === "user" && plan === "vip" && <VipBadge />}
      {status === "user" && <span className="sr-only">({t.account.myAccount})</span>}
    </Link>
  );
}

/** Aviso en la página de alertas: crear cuenta para tener la lista en otros dispositivos. */
export function AccountHint({ hotel }: { hotel: string }) {
  const { t, href } = useI18n();
  const { status, name } = useAccount();
  if (status === "user" && name) return <p className="text-sm text-text-2">{t.account.hintUser(name)}</p>;
  if (status !== "anon") return null;
  return (
    <p className="text-sm text-text-2">
      {t.account.hintAnon}{" "}
      <Link prefetch={false} href={href(`/${hotel}/cuenta`)} className="text-accent hover:underline">
        {t.account.hintAnonLink}
      </Link>
    </p>
  );
}
