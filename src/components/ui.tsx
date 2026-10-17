"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/client";

/** Moneda propia (no es el ícono de crédito de Habbo). */
export function CoinGlyph({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`inline-block shrink-0 ${className}`} aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" fill="#f5b942" />
      <circle cx="8" cy="8" r="4" fill="none" stroke="#b07d17" strokeWidth="1.4" />
    </svg>
  );
}

export function Credits({ value, className = "" }: { value: number | null | undefined; className?: string }) {
  const { t, f } = useI18n();
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) {
    return <span className={`text-muted ${className}`}>—</span>;
  }
  return (
    <span className={`tnum inline-flex items-center gap-1 ${className}`}>
      {f.price(value)}
      <CoinGlyph />
      <span className="sr-only">{t.common.credits}</span>
    </span>
  );
}

/** Variación con flecha y signo (el color nunca es la única pista). */
export function Delta({ value, className = "" }: { value: number | null | undefined; className?: string }) {
  const { f } = useI18n();
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return <span className={`text-muted ${className}`}>—</span>;
  }
  const up = value > 0;
  const flat = Math.abs(value) < 0.0005;
  return (
    <span className={`tnum inline-flex items-center gap-0.5 whitespace-nowrap ${flat ? "text-text-2" : up ? "text-up" : "text-down"} ${className}`}>
      <span aria-hidden="true">{flat ? "•" : up ? "▲" : "▼"}</span>
      {f.pct(value)}
    </span>
  );
}

export function StatTile({ label, value, sub, help }: { label: string; value: ReactNode; sub?: ReactNode; help?: string }) {
  return (
    <div className="card p-4" title={help}>
      <div className="text-sm text-text-2">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold text-text">{value}</div>
      {sub && <div className="mt-1 text-sm text-text-2">{sub}</div>}
    </div>
  );
}

export function SectionTitle({ title, hint, href, linkLabel }: { title: string; hint?: string; href?: string; linkLabel?: string }) {
  const { t } = useI18n();
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-xl font-bold text-text">{title}</h2>
        {hint && <p className="text-sm text-text-2">{hint}</p>}
      </div>
      {href && (
        <Link prefetch={false} href={href} className="shrink-0 text-sm text-accent hover:underline">
          {linkLabel ?? t.common.seeAll}
        </Link>
      )}
    </div>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" }) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        tone === "warn" ? "border-accent/40 bg-accent/10 text-text" : "border-line bg-surface text-text-2"
      }`}
      role={tone === "warn" ? "status" : undefined}
    >
      {children}
    </div>
  );
}

/** Mini gráfico de 30 días (sin interacción: los valores están en la misma fila). */
export function Sparkline({ values, width = 96, height = 28 }: { values: (number | null)[]; width?: number; height?: number }) {
  const { t } = useI18n();
  const points = values.map((v, i) => [i, v] as const).filter((p): p is readonly [number, number] => p[1] !== null);
  if (points.length < 2) return <span className="inline-block text-xs text-muted" style={{ width }}>{t.common.fewSales}</span>;
  const ys = points.map((p) => p[1]);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const span = max - min || 1;
  const n = Math.max(values.length - 1, 1);
  const pad = 3;
  const x = (i: number) => pad + (i / n) * (width - pad * 2);
  const y = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2);
  const d = points.map(([i, v], idx) => `${idx ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const last = points[points.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="shrink-0">
      <path d={d} fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(last[0])} cy={y(last[1])} r="2.5" fill="var(--series-1)" stroke="var(--surface)" strokeWidth="1.5" />
    </svg>
  );
}
