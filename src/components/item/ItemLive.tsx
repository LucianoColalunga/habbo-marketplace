"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MarketStats } from "@/lib/habbo/api";
import { fetchLive, LiveLimitError } from "@/lib/habbo/live-client";
import type { HotelCode } from "@/lib/hotels";
import { useI18n } from "@/lib/i18n/client";
import type { DayPoint, SnapPoint } from "@/lib/market/history";
import { lastDays, mergeDayRows, snapRows } from "@/lib/market/series";
import { referencePrice, summarize, weeklyChange, type ItemSummary } from "@/lib/market/stats";
import { Credits, Delta, StatTile } from "@/components/ui";
import { TimeAgo } from "@/components/Freshness";
import { useNow } from "@/lib/use-now";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { ColumnChart } from "@/components/charts/ColumnChart";

interface Props {
  hotel: HotelCode;
  k: string;
  t: "r" | "w";
  stored: ItemSummary | null;
  storedAt: string | null;
  days: DayPoint[];
  snaps: SnapPoint[];
}

type Status = "loading" | "live" | "limited" | "error";
type Problem = "limitReached" | "noData" | "throttled" | "failed";

interface Outcome {
  status: Status;
  live?: { stats: MarketStats; at: number };
  message: Problem | "";
}

const RANGES = [
  { id: 30, key: "d30" },
  { id: 90, key: "d90" },
  { id: Number.POSITIVE_INFINITY, key: "all" },
] as const;

export function ItemLive({ hotel, k, t: type, stored, storedAt, days, snaps }: Props) {
  const { t: ui, f } = useI18n();
  const t = ui.item;
  const [live, setLive] = useState<{ stats: MarketStats; at: number } | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<Problem | "">("");
  const [range, setRange] = useState<number>(30);
  const [showTable, setShowTable] = useState(false);
  // "Ahora" se toma recién en el navegador (no durante el render del servidor).
  const now = useNow() ?? 0;

  /** Consulta en vivo y devuelve qué mostrar (sin tocar el estado). */
  const query = useCallback(
    async (force: boolean): Promise<Outcome> => {
      try {
        const res = await fetchLive(hotel, [{ name: k, type }], { force });
        const stats = res.stats.get(k);
        if (stats) return { status: "live", live: { stats, at: res.fetchedAt }, message: "" };
        if (res.skipped.length) return { status: "limited", message: "limitReached" };
        return { status: "error", message: "noData" };
      } catch (error) {
        return error instanceof LiveLimitError ? { status: "limited", message: "throttled" } : { status: "error", message: "failed" };
      }
    },
    [hotel, k, type],
  );

  const apply = useCallback((o: Outcome) => {
    if (o.live) setLive(o.live);
    setStatus(o.status);
    setMessage(o.message);
  }, []);

  useEffect(() => {
    let alive = true;
    void query(false).then((o) => alive && apply(o));
    return () => {
      alive = false;
    };
  }, [query, apply]);

  const current: ItemSummary | null = useMemo(() => (live ? summarize(live.stats) : stored), [live, stored]);
  const rows = useMemo(() => mergeDayRows(days, live?.stats ?? null), [days, live]);
  const snapsRows = useMemo(
    () => snapRows(snaps, live ? { at: live.at, cp: live.stats.currentPrice, oo: live.stats.currentOpenOffers } : null),
    [snaps, live],
  );
  const lastRowX = rows.length ? rows[rows.length - 1].x : 0;
  const lastSnapX = snapsRows.length ? snapsRows[snapsRows.length - 1].x : 0;
  const visibleRows = lastDays(rows, range, Math.max(lastRowX, now - 86_400_000));
  const visibleSnaps = lastDays(
    snapsRows.filter((s) => s.cp > 0),
    range,
    Math.max(lastSnapX, now),
  );
  const ref = current ? referencePrice(current) : null;
  const change = current ? weeklyChange(current) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div aria-live="polite" className="text-text-2">
          {status === "loading" && t.querying}
          {status === "live" && live && (
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-up" aria-hidden="true" />
              {ui.common.liveAt} <TimeAgo iso={new Date(live.at).toISOString()} />
            </span>
          )}
          {(status === "limited" || status === "error") && (
            <span>
              {message ? t[message] : ""}{" "}
              {storedAt && (
                <>
                  {ui.common.lastScan} <TimeAgo iso={storedAt} />.
                </>
              )}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setStatus("loading");
            void query(true).then(apply);
          }}
          disabled={status === "loading"}
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-text hover:bg-surface-2 disabled:opacity-50"
        >
          {ui.common.refresh}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile
          label={t.minPrice}
          value={current && current.oo > 0 ? <Credits value={current.cp} /> : <span className="text-muted">{ui.common.noOffers}</span>}
          help={t.minPriceHelp}
        />
        <StatTile label={t.openOffers} value={<span className="tnum">{f.int(current?.oo ?? 0)}</span>} />
        <StatTile
          label={t.avg7}
          value={<Credits value={current?.a7 ?? null} />}
          sub={
            <span className="inline-flex items-center gap-1">
              <Delta value={change} /> <span className="text-muted">{ui.common.vsPrevWeek}</span>
            </span>
          }
        />
        <StatTile
          label={t.avg30}
          value={<Credits value={current?.a30 ?? (current?.ap || null)} />}
          sub={current?.ap ? <span>{t.habboSays(f.price(current.ap))}</span> : undefined}
        />
        <StatTile
          label={t.sold30}
          value={<span className="tnum">{f.int(current?.s30 ?? 0)}</span>}
          sub={current?.ls ? <span>{t.lastSale(current.ls)}</span> : undefined}
        />
      </div>

      {ref !== null && current && current.oo > 0 && current.cp < ref && (
        <p className="text-sm text-text-2">
          {t.belowA} <strong className="text-text">{f.pct((ref - current.cp) / ref, false)}</strong> {t.belowB(f.price(ref))}
        </p>
      )}

      <section className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold text-text">{t.chartTitle}</h2>
            <p className="text-sm text-text-2">{t.chartHint}</p>
          </div>
          <div className="flex gap-1" role="group" aria-label={t.rangeAria}>
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                aria-pressed={range === r.id}
                onClick={() => setRange(r.id)}
                className={`rounded-lg px-3 py-1 text-sm ${range === r.id ? "bg-surface-3 text-text" : "text-text-2 hover:bg-surface-2"}`}
              >
                {t[r.key]}
              </button>
            ))}
          </div>
        </div>
        <TimeSeriesChart
          ariaLabel={t.chartAria}
          yFormat={(v) => f.compact(v)}
          xFormat={f.shortDate}
          xFormatLong={f.dayTime}
          series={[
            { id: "avg", label: t.seriesAvg, color: "var(--series-1)", points: visibleRows.map((r) => ({ x: r.x, y: r.avg })) },
            { id: "min", label: t.seriesMin, color: "var(--series-2)", points: visibleSnaps.map((s) => ({ x: s.x, y: s.cp })) },
          ]}
        />
      </section>

      <section className="card p-4">
        <h2 className="font-display text-lg font-bold text-text">{t.soldTitle}</h2>
        <p className="mb-3 text-sm text-text-2">{t.soldHint}</p>
        <ColumnChart
          ariaLabel={t.soldTitle}
          points={visibleRows.map((r) => ({ x: r.x, y: r.sold }))}
          yFormat={(v) => f.compact(v)}
          xFormat={f.shortDate}
          valueLabel={t.soldUnit}
        />
      </section>

      <section>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-expanded={showTable}
          className="text-sm text-accent hover:underline"
        >
          {showTable ? t.tableHide : t.tableShow}
        </button>
        {showTable && (
          <div className="card mt-3 overflow-x-auto relative">
            <table className="w-full text-sm">
              <caption className="sr-only">{t.tableCaption}</caption>
              <thead className="text-left text-text-2">
                <tr className="border-b border-line">
                  <th className="px-4 py-2 font-medium">{t.colDay}</th>
                  <th className="px-4 py-2 text-right font-medium">{t.colAvg}</th>
                  <th className="px-4 py-2 text-right font-medium">{t.colSold}</th>
                  <th className="px-4 py-2 text-right font-medium">{t.colOffers}</th>
                </tr>
              </thead>
              <tbody className="tnum">
                {[...visibleRows].reverse().map((r) => (
                  <tr key={r.x} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-1.5 text-text-2">{f.day(r.x)}</td>
                    <td className="px-4 py-1.5 text-right text-text">{f.price(r.avg)}</td>
                    <td className="px-4 py-1.5 text-right text-text">{f.int(r.sold)}</td>
                    <td className="px-4 py-1.5 text-right text-text">{f.int(r.offers)}</td>
                  </tr>
                ))}
                {visibleRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-muted">
                      {t.noSalesPeriod}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
