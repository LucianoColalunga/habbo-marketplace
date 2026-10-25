"use client";

import { useState } from "react";
import { ColumnChart } from "@/components/charts/ColumnChart";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { ExportCsvButton } from "@/components/ExportCsvButton";
import { Notice, StatTile } from "@/components/ui";
import { useI18n } from "@/lib/i18n/client";
import { flowTotals, type MarketFlow, type MarketFlowDay } from "@/lib/market/flow";

type Metric = "sold" | "credits" | "offers";

const dayMs = (date: number) => Date.UTC(Math.floor(date / 10000), (Math.floor(date / 100) % 100) - 1, date % 100);

/**
 * Movimiento de una categoría o de todo el hotel: totales de los últimos días y
 * un gráfico por día. Se ve una medida por vez (vendidas, créditos o
 * publicaciones): tienen escalas muy distintas y no van en un mismo eje.
 */
export function MarketFlowCard({
  flow,
  title,
  tiles = true,
  exportName = "movimiento",
}: {
  flow: MarketFlow | null;
  title: string;
  tiles?: boolean;
  exportName?: string;
}) {
  const { t: ui, f } = useI18n();
  const t = ui.marketFlow;
  const [metric, setMetric] = useState<Metric>("sold");
  if (!flow) return null;
  const week = flowTotals(flow.days);
  const x = (d: MarketFlowDay) => dayMs(d[0]);
  const offerDays = flow.days.filter((d): d is [number, number, number, number] => d[3] !== null);
  const labels: Record<Metric, string> = {
    sold: t.sold,
    credits: t.credits,
    offers: t.offers,
  };

  return (
    <section className="card space-y-4 p-4" aria-label={title}>
      <div>
        <h2 className="font-display text-xl font-bold text-text">{title}</h2>
        <p className="text-sm text-text-2">{t.hint}</p>
      </div>
      {tiles && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile label={t.soldIn(week.count || 7)} value={<span className="tnum">{week.count ? f.int(week.sold) : "—"}</span>} />
          <StatTile
            label={t.creditsIn(week.count || 7)}
            value={<span className="tnum">{week.count ? f.compact(week.credits) : "—"}</span>}
          />
          <StatTile
            label={t.offersNow}
            value={<span className="tnum">{f.int(flow.offersNow)}</span>}
            sub={t.offersNowSub(f.int(flow.itemsWithOffers))}
          />
        </div>
      )}

      {flow.days.length === 0 ? (
        <Notice>{t.warming}</Notice>
      ) : (
        <>
          <div role="group" aria-label={t.tabsAria} className="flex flex-wrap gap-1">
            {(["sold", "credits", "offers"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={metric === m}
                onClick={() => setMetric(m)}
                className={`rounded-lg px-3 py-1.5 text-sm ${metric === m ? "bg-surface-3 text-text" : "text-text-2 hover:bg-surface-2"}`}
              >
                {labels[m]}
              </button>
            ))}
            <span className="ml-auto">
              <ExportCsvButton
                name={exportName}
                rows={() => [
                  [t.colDate, t.sold, t.credits, t.colOffers],
                  ...flow.days.map((d) => [new Date(x(d)).toISOString().slice(0, 10), d[1], d[2], d[3]]),
                ]}
              />
            </span>
          </div>
          {metric === "sold" && (
            <ColumnChart
              ariaLabel={t.soldAria}
              points={flow.days.map((d) => ({ x: x(d), y: d[1] }))}
              yFormat={(v) => f.compact(v)}
              xFormat={f.shortDate}
              valueLabel={t.soldUnit}
            />
          )}
          {metric === "credits" && (
            <ColumnChart
              ariaLabel={t.creditsAria}
              color="var(--series-2)"
              points={flow.days.map((d) => ({ x: x(d), y: d[2] }))}
              yFormat={(v) => f.compact(v)}
              xFormat={f.shortDate}
              valueLabel={t.creditsUnit}
            />
          )}
          {metric === "offers" &&
            (offerDays.length > 1 ? (
              <TimeSeriesChart
                ariaLabel={t.offersAria}
                height={180}
                yFormat={(v) => f.int(v)}
                xFormat={f.shortDate}
                xFormatLong={f.day}
                series={[
                  {
                    id: "offers",
                    label: t.offers,
                    color: "var(--series-3)",
                    points: offerDays.map((d) => ({ x: x(d), y: d[3] })),
                  },
                ]}
              />
            ) : (
              <Notice>{t.noOffersData}</Notice>
            ))}
          <details>
            <summary className="cursor-pointer text-sm text-text-2">{t.table}</summary>
            <div className="relative mt-3 overflow-x-auto">
              <table className="w-full min-w-[26rem] text-right text-sm">
                <thead className="text-text-2">
                  <tr>
                    <th className="py-1 pr-3 text-left font-medium">{t.colDate}</th>
                    <th className="py-1 pr-3 font-medium">{t.sold}</th>
                    <th className="py-1 pr-3 font-medium">{t.credits}</th>
                    <th className="py-1 font-medium">{t.colOffers}</th>
                  </tr>
                </thead>
                <tbody className="tnum text-text">
                  {[...flow.days].reverse().map((d) => (
                    <tr key={d[0]} className="border-t border-line">
                      <td className="py-1 pr-3 text-left">{f.day(x(d))}</td>
                      <td className="py-1 pr-3">{f.int(d[1])}</td>
                      <td className="py-1 pr-3">{f.int(d[2])}</td>
                      <td className="py-1">{d[3] === null ? "—" : f.int(d[3])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
