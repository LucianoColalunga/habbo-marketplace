import Link from "next/link";
import type { FurniRow } from "@/lib/data/rankings";
import type { Format } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { FurniIcon } from "./FurniIcon";
import { Credits, Delta, Sparkline } from "./ui";

export type Metric = "s7" | "c7" | "change" | "ref" | "oo" | "pct";

function MetricValue({ row, metric, f }: { row: FurniRow; metric: Metric; f: Format }) {
  switch (metric) {
    case "s7":
      return <span className="tnum">{f.int(row.s7)}</span>;
    case "c7":
      return <Credits value={row.c7} />;
    case "change":
      return <Delta value={row.change} />;
    case "ref":
      return <Credits value={row.ref} />;
    case "oo":
      return <span className="tnum">{f.int(row.oo)}</span>;
    case "pct":
      return <span className="tnum font-medium text-up">−{f.pct(row.pct ?? null, false)}</span>;
  }
}

/** Lista compacta para las tarjetas del inicio. */
export async function FurniMiniList({ hotel, rows, metric, empty }: { hotel: string; rows: FurniRow[]; metric: Metric; empty: string }) {
  const { t, f, href } = await getI18n();
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-muted">{empty}</p>;
  return (
    <ol className="divide-y divide-line/70">
      {rows.map((row, i) => (
        <li key={row.k}>
          <Link
            prefetch={false}
            href={href(`/${hotel}/furni/${encodeURIComponent(row.k)}`)}
            className="flex items-center gap-3 py-2 hover:bg-surface-2/60"
          >
            <span className="tnum w-5 text-right text-xs text-muted">{i + 1}</span>
            <FurniIcon k={row.k} r={row.r} size={36} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-text">{row.n}</span>
              <span className="block text-xs text-text-2">
                {row.oo > 0 ? (
                  <>
                    {t.common.from} <Credits value={row.cp} />
                  </>
                ) : (
                  t.common.noOffers
                )}
              </span>
            </span>
            <span className="shrink-0 text-right text-sm">
              <MetricValue row={row} metric={metric} f={f} />
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

/** Tabla completa para la página de rankings. */
export async function FurniTable({ hotel, rows, metric }: { hotel: string; rows: FurniRow[]; metric: Metric }) {
  const { p, f, href } = await getI18n();
  const l = p.list;
  if (rows.length === 0) {
    return <p className="card p-8 text-center text-sm text-muted">{l.empty}</p>;
  }
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="text-left text-text-2">
          <tr className="border-b border-line">
            <th className="w-10 px-3 py-2 text-right font-medium">#</th>
            <th className="px-3 py-2 font-medium">{l.colFurni}</th>
            <th className="px-3 py-2 text-right font-medium">{l.metric[metric]}</th>
            <th className="px-3 py-2 text-right font-medium">{l.colMin}</th>
            <th className="px-3 py-2 text-right font-medium">{l.colForSale}</th>
            <th className="px-3 py-2 text-right font-medium">{l.colAvg7}</th>
            <th className="hidden px-3 py-2 font-medium md:table-cell">{l.col30}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.k} className="border-b border-line/60 last:border-0 hover:bg-surface-2/60">
              <td className="tnum px-3 py-2 text-right text-muted">{i + 1}</td>
              <td className="px-3 py-2">
                <Link prefetch={false} href={href(`/${hotel}/furni/${encodeURIComponent(row.k)}`)} className="flex items-center gap-3">
                  <FurniIcon k={row.k} r={row.r} size={36} />
                  <span className="min-w-0">
                    <span className="block truncate text-text hover:underline">{row.n}</span>
                    <span className="block truncate font-mono text-xs text-muted">{row.k}</span>
                  </span>
                </Link>
              </td>
              <td className="px-3 py-2 text-right">
                <MetricValue row={row} metric={metric} f={f} />
              </td>
              <td className="px-3 py-2 text-right">{row.oo > 0 ? <Credits value={row.cp} /> : <span className="text-muted">—</span>}</td>
              <td className="tnum px-3 py-2 text-right text-text-2">{f.int(row.oo)}</td>
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
