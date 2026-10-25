"use client";

import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { Notice, StatTile } from "@/components/ui";
import { useI18n } from "@/lib/i18n/client";
import { dayMs, lastDaysTotals } from "@/lib/nft/flows";
import type { NftCollectionDay, NftCollectionStats } from "@/lib/nft/model";

/**
 * Movimiento de una colección NFT: cuántas existen, cuántas se venden, se
 * acuñan y se queman por día. Dos gráficos separados porque miden cosas de
 * escala muy distinta (movimientos por día y unidades totales).
 */
export function NftCollectionFlow({ stats }: { stats: NftCollectionStats | null }) {
  const { t: ui, f } = useI18n();
  const t = ui.nftFlows;
  if (!stats || (stats.units === null && stats.days.length === 0)) return <Notice>{t.noData}</Notice>;
  const week = lastDaysTotals(stats.days);
  const existing = stats.days.filter((d): d is [number, number, number, number, number] => d[4] !== null);
  const x = (d: NftCollectionDay) => dayMs(d[0]);

  return (
    <section className="space-y-4" aria-label={t.title}>
      <div>
        <h2 className="font-display text-xl font-bold text-text">{t.title}</h2>
        <p className="text-sm text-text-2">{t.hint}</p>
        <p className="text-xs text-muted">{t.explain}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label={t.existing}
          value={<span className="tnum">{stats.units === null ? "—" : f.int(stats.units)}</span>}
          sub={stats.models !== null ? t.existingSub(f.int(stats.models)) : undefined}
        />
        <StatTile label={t.soldIn(week.count)} value={<span className="tnum">{f.int(week.sold)}</span>} />
        <StatTile label={t.mintedIn(week.count)} value={<span className="tnum">{f.int(week.minted)}</span>} />
        <StatTile label={t.burnedIn(week.count)} value={<span className="tnum">{f.int(week.burned)}</span>} />
      </div>
      {!week.full && <p className="text-xs text-muted">{t.collecting}</p>}

      {stats.days.length > 0 && (
        <div className="card p-4">
          <h3 className="mb-3 font-display text-lg font-bold text-text">{t.perDayTitle}</h3>
          <TimeSeriesChart
            ariaLabel={t.perDayAria}
            includeZero
            yFormat={(v) => f.int(v)}
            xFormat={f.shortDate}
            xFormatLong={f.day}
            series={[
              { id: "sold", label: t.sold, color: "var(--series-1)", points: stats.days.map((d) => ({ x: x(d), y: d[1] })) },
              { id: "burned", label: t.burned, color: "var(--series-2)", points: stats.days.map((d) => ({ x: x(d), y: d[3] })) },
              { id: "minted", label: t.minted, color: "var(--series-3)", points: stats.days.map((d) => ({ x: x(d), y: d[2] })) },
            ]}
          />
        </div>
      )}

      {existing.length > 1 && (
        <div className="card p-4">
          <h3 className="mb-3 font-display text-lg font-bold text-text">{t.existingTitle}</h3>
          <TimeSeriesChart
            ariaLabel={t.existingAria}
            yFormat={(v) => f.int(v)}
            xFormat={f.shortDate}
            xFormatLong={f.day}
            series={[{ id: "existing", label: t.existing, color: "var(--series-1)", points: existing.map((d) => ({ x: x(d), y: d[4] })) }]}
          />
        </div>
      )}

      {stats.days.length > 0 && (
        <details className="card p-4">
          <summary className="cursor-pointer text-sm text-text-2">{t.table}</summary>
          <div className="relative mt-3 overflow-x-auto">
            <table className="w-full min-w-[28rem] text-right text-sm">
              <thead className="text-text-2">
                <tr>
                  <th className="py-1 pr-3 text-left font-medium">{t.colDate}</th>
                  <th className="py-1 pr-3 font-medium">{t.sold}</th>
                  <th className="py-1 pr-3 font-medium">{t.minted}</th>
                  <th className="py-1 pr-3 font-medium">{t.burned}</th>
                  <th className="py-1 font-medium">{t.colExisting}</th>
                </tr>
              </thead>
              <tbody className="tnum text-text">
                {[...stats.days].reverse().map((d) => (
                  <tr key={d[0]} className="border-t border-line">
                    <td className="py-1 pr-3 text-left">{f.day(x(d))}</td>
                    <td className="py-1 pr-3">{f.int(d[1])}</td>
                    <td className="py-1 pr-3">{f.int(d[2])}</td>
                    <td className="py-1 pr-3">{f.int(d[3])}</td>
                    <td className="py-1">{d[4] === null ? "—" : f.int(d[4])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}
