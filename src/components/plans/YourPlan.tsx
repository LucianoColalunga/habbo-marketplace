"use client";

import Link from "next/link";
import { useAccount } from "@/lib/accounts/client";
import { useI18n } from "@/lib/i18n/client";
import { PLANS_TEXT } from "@/lib/i18n/plans";

/** "Tu plan" sobre la tarjeta que corresponde, o un enlace para crear la cuenta. */
export function YourPlan({ plan, hotel }: { plan: "standard" | "vip"; hotel: string }) {
  const { lang, href } = useI18n();
  const t = PLANS_TEXT[lang];
  const account = useAccount();
  if (account.status === "user" && account.plan === plan) {
    return <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-ink">{t.yourPlan}</span>;
  }
  if (plan === "standard" && account.status === "anon") {
    return (
      <Link prefetch={false} href={href(`/${hotel}/cuenta`)} className="text-sm text-accent hover:underline">
        {t.createAccount}
      </Link>
    );
  }
  return null;
}

/** Insignia VIP (en el encabezado y en la cuenta). */
export function VipBadge() {
  return <span className="rounded bg-accent/20 px-1.5 text-[11px] font-bold leading-5 text-accent">VIP</span>;
}
