import Link from "next/link";
import type { FurniRow } from "@/lib/data/rankings";
import { formatInt, formatPct } from "@/lib/format";
import { FurniIcon } from "./FurniIcon";
import { Credits, Delta, Sparkline } from "./ui";

export type Metric = "s7" | "c7" | "change" | "ref" | "oo" | "pct";

const METRIC_LABEL: Record<Metric, string> = {
  s7: "Vendidos 7 d",
  c7: "Créditos 7 d",
  change: "Variación",
  ref: "Promedio",
  oo: "En venta",
  pct: "Bajo el promedio",
};

function MetricValue({ row, metric }: { row: FurniRow; metric: Metric }) {
  switch (metric) {
    case "s7":
      return <span className="tnum">{formatInt(row.s7)}</span>;
    case "c7":
      return <Credits value={row.c7} />;
    case "change":
      return <Delta value={row.change} />;
    case "ref":
      return <Credits value={row.ref} />;
    case "oo":
      return <span className="tnum">{formatInt(row.oo)}</span>;
    case "pct":
      return <span className="tnum font-medium text-up">−{formatPct(row.pct ?? null, false)}</span>;
  }
}

/** Lista compacta para las tarjetas del inicio. */
export function FurniMiniList({ hotel, rows, metric, empty }: { hotel: string; rows: FurniRow[]; metric: Metric; empty: string }) {
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-muted">{empty}</p>;
  return (
    <ol className="divide-y divide-line/70">
      {rows.map((row, i) => (
        <li key={row.k}>
          <Link href={`/${hotel}/furni/${encodeURIComponent(row.k)}`} className="flex items-center gap-3 py-2 hover:bg-surface-2/60">
            <span className="tnum w-5 text-right text-xs text-muted">{i + 1}</span>
            <FurniIcon k={row.k} r={row.r} size={36} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-text">{row.n}</span>
              <span className="block text-xs text-text-2">
                {row.oo > 0 ? (
                  <>
                    desde <Credits value={row.cp} />
                  </>
                ) : (
                  "sin ofertas"
                )}
              </span>
            </span>
            <span className="shrink-0 text-right text-sm">
              <MetricValue row={row} metric={metric} />
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

/** Tabla completa para la página de rankings. */
export function FurniTable({ hotel, rows, metric }: { hotel: string; rows: FurniRow[]; metric: Metric }) {
  if (rows.length === 0) {
    return <p className="card p-8 text-center text-sm text-muted">Todavía no hay datos suficientes para esta lista.</p>;
  }
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="text-left text-text-2">
          <tr className="border-b border-line">
            <th className="w-10 px-3 py-2 text-right font-medium">#</th>
            <th className="px-3 py-2 font-medium">Furni</th>
            <th className="px-3 py-2 text-right font-medium">{METRIC_LABEL[metric]}</th>
            <th className="px-3 py-2 text-right font-medium">Precio mínimo</th>
            <th className="px-3 py-2 text-right font-medium">En venta</th>
            <th className="px-3 py-2 text-right font-medium">Promedio 7 d</th>
            <th className="hidden px-3 py-2 font-medium md:table-cell">30 días</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.k} className="border-b border-line/60 last:border-0 hover:bg-surface-2/60">
              <td className="tnum px-3 py-2 text-right text-muted">{i + 1}</td>
              <td className="px-3 py-2">
                <Link href={`/${hotel}/furni/${encodeURIComponent(row.k)}`} className="flex items-center gap-3">
                  <FurniIcon k={row.k} r={row.r} size={36} />
                  <span className="min-w-0">
                    <span className="block truncate text-text hover:underline">{row.n}</span>
                    <span className="block truncate font-mono text-xs text-muted">{row.k}</span>
                  </span>
                </Link>
              </td>
              <td className="px-3 py-2 text-right">
                <MetricValue row={row} metric={metric} />
              </td>
              <td className="px-3 py-2 text-right">{row.oo > 0 ? <Credits value={row.cp} /> : <span className="text-muted">—</span>}</td>
              <td className="tnum px-3 py-2 text-right text-text-2">{formatInt(row.oo)}</td>
              <td className="px-3 py-2 text-right text-text-2">
                <Credits value={row.a7} />
              </td>
              <td className="hidden px-3 py-2 md:table-cell">
                <Sparkline values={row.sp} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
