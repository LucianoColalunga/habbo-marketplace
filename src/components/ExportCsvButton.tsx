"use client";

import Link from "next/link";
import { useAccount } from "@/lib/accounts/client";
import { downloadCsv, type CsvCell } from "@/lib/csv";
import { homeHotel } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";
import { PLANS_TEXT } from "@/lib/i18n/plans";

/**
 * Exportar a CSV: función del plan VIP. Con otro plan, el botón lleva a la
 * página de planes. `rows` puede ser una función para armar la tabla recién al
 * tocar el botón (por ejemplo, con los filtros aplicados).
 */
export function ExportCsvButton({ name, rows, hotel }: { name: string; rows: CsvCell[][] | (() => CsvCell[][]); hotel?: string }) {
  const { lang, href } = useI18n();
  const t = PLANS_TEXT[lang];
  const { plan } = useAccount();
  const base = "inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm";
  const icon = (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
      <path d="M10 3v9m0 0-3.5-3.5M10 12l3.5-3.5M4 14v2.5h12V14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (plan !== "vip") {
    return (
      <Link
        prefetch={false}
        href={href(`/${hotel ?? homeHotel(lang)}/planes`)}
        title={t.vipOnlyHint}
        className={`${base} text-muted hover:text-text`}
      >
        {icon}
        {t.export}
        <span className="rounded bg-accent/15 px-1.5 text-xs font-bold text-accent">VIP</span>
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => downloadCsv(name, typeof rows === "function" ? rows() : rows)} className={`${base} text-text hover:bg-surface-2`}>
      {icon}
      {t.export}
    </button>
  );
}
