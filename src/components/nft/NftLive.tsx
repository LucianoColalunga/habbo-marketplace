"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { IMX_BASE, normalizeStack, type NftStack } from "@/lib/nft/api";
import type { NftDayPoint, NftRow, NftSnapPoint } from "@/lib/nft/model";
import { nftWeeklyChange } from "@/lib/nft/rankings";
import { dateNumToMs } from "@/lib/market/history";
import { useNow } from "@/lib/use-now";
import { Delta, StatTile } from "@/components/ui";
import { TimeAgo } from "@/components/Freshness";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { ColumnChart } from "@/components/charts/ColumnChart";

interface Listing {
  tokenId: string;
  usd: number | null;
  native: { amount: number; symbol: string } | null;
}

interface LiveData {
  stack: NftStack;
  listings: Listing[];
  at: number;
}

type Status = "loading" | "live" | "error";

interface RawLive {
  listings?: {
    token_id?: string;
    price_details?: {
      converted_prices?: { USD?: string };
      fee_inclusive_amount?: string;
      token?: { decimals?: number; symbol?: string };
    };
  }[];
}

async function fetchLiveStack(id: string): Promise<LiveData | null> {
  const res = await fetch(`${IMX_BASE}/stacks?stack_id=${id}`, {
    mode: "cors",
    credentials: "omit",
  });
  if (!res.ok) throw new Error(`Immutable ${res.status}`);
  const body = (await res.json()) as unknown[];
  const raw = Array.isArray(body) ? body[0] : null;
  const stack = raw ? normalizeStack(raw as Parameters<typeof normalizeStack>[0]) : null;
  if (!stack) return null;
  const listings: Listing[] = ((raw as RawLive).listings ?? []).map((l) => {
    const p = l.price_details;
    const usd = Number.parseFloat(p?.converted_prices?.USD ?? "");
    const decimals = p?.token?.decimals ?? 18;
    const amount = p?.fee_inclusive_amount ? Number(p.fee_inclusive_amount) / 10 ** decimals : null;
    return {
      tokenId: l.token_id ?? "",
      usd: Number.isFinite(usd) ? usd : null,
      native: amount !== null && Number.isFinite(amount) ? { amount, symbol: p?.token?.symbol ?? "" } : null,
    };
  });
  listings.sort((a, b) => (a.usd ?? Infinity) - (b.usd ?? Infinity));
  return { stack, listings, at: Date.now() };
}

/**
 * Escalera de compra: cada publicación (de la más barata a la más cara) con su
 * diferencia contra la más barata y cuánto cuesta comprar hasta ella.
 * Immutable devuelve las publicaciones ordenadas por precio (verificado).
 */
export function ladder(listings: Listing[]) {
  const first = listings[0]?.usd ?? null;
  let total: number | null = 0;
  return listings.map((l, i) => {
    total = total !== null && l.usd !== null ? total + l.usd : null;
    return {
      l,
      rank: i + 1,
      diff: first !== null && first > 0 && l.usd !== null ? (l.usd - first) / first : null,
      total,
    };
  });
}

/**
 * "Si compran la más barata, la próxima queda a…". Las que están al mismo precio
 * (en centavos) se cuentan juntas: la "próxima" es la primera más cara.
 */
function NextPrice({ listings }: { listings: Listing[] }) {
  const { t: ui, f } = useI18n();
  const t = ui.nftLive;
  const box = "mb-3 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-text";
  const first = listings[0];
  if (listings.length === 1) return <p className={box}>{t.onlyOne}</p>;
  if (!first || first.usd === null || first.usd <= 0) return null;
  const cents = (usd: number | null) => (usd === null ? null : Math.round(usd * 100));
  const same = listings.filter((l) => cents(l.usd) === cents(first.usd)).length;
  const next = listings.find((l) => l.usd !== null && (cents(l.usd) ?? 0) > (cents(first.usd) ?? 0));
  if (!next || next.usd === null) return <p className={box}>{t.allSame(listings.length, f.usd(first.usd))}</p>;
  const pct = f.pct((next.usd - first.usd) / first.usd, false);
  return (
    <p className={box}>
      {same > 1 ? t.sameThenNext(same, f.usd(first.usd), f.usd(next.usd), pct) : t.nextIfBought(f.usd(first.usd), f.usd(next.usd), pct)}
    </p>
  );
}

export function NftLive({
  id,
  contract,
  stored,
  days,
  snaps,
}: {
  id: string;
  contract: string;
  stored: NftRow | null;
  days: NftDayPoint[];
  snaps: NftSnapPoint[];
}) {
  const { t: ui, f } = useI18n();
  const t = ui.nftLive;
  const [live, setLive] = useState<LiveData | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const now = useNow() ?? 0;

  const query = useCallback(async () => {
    try {
      const data = await fetchLiveStack(id);
      return data ? { live: data, status: "live" as Status } : { live: null, status: "error" as Status };
    } catch {
      return { live: null, status: "error" as Status };
    }
  }, [id]);

  useEffect(() => {
    let alive = true;
    void query().then((o) => {
      if (!alive) return;
      if (o.live) setLive(o.live);
      setStatus(o.status);
    });
    return () => {
      alive = false;
    };
  }, [query]);

  const floor = live?.stack.floorUsd ?? stored?.floorUsd ?? null;
  const floorNative = live?.stack.floorNative ?? stored?.floorNative ?? null;
  const bid = live?.stack.bidUsd ?? stored?.bidUsd ?? null;
  const lastUsd = live?.stack.lastUsd ?? stored?.lastUsd ?? null;
  const lastAt = live?.stack.lastAt ?? stored?.lastAt ?? null;

  const salesRows = useMemo(
    () =>
      days.map(([date, count, usd]) => ({
        x: dateNumToMs(date),
        count,
        avg: count ? usd / count : 0,
      })),
    [days],
  );
  const floorPoints = useMemo(() => {
    const pts = snaps.map(([min, fl]) => ({ x: min * 60_000, y: fl }));
    if (live?.stack.floorUsd !== null && live?.stack.floorUsd !== undefined) pts.push({ x: live.at, y: live.stack.floorUsd });
    return pts;
  }, [snaps, live]);
  const from = now ? now - 30 * 86_400_000 : 0;
  const recentSales = salesRows.filter((r) => r.x >= from);

  return (
    <div className="space-y-6">
      <div className="text-sm text-text-2" aria-live="polite">
        {status === "loading" && t.querying}
        {status === "live" && live && (
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-up" aria-hidden="true" />
            {ui.common.liveAt} <TimeAgo iso={new Date(live.at).toISOString()} />
          </span>
        )}
        {status === "error" && t.error}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile
          label={t.floor}
          value={f.usd(floor)}
          sub={floorNative ? f.crypto(floorNative.amount, floorNative.symbol) : t.noListings}
          help={t.floorHelp}
        />
        <StatTile label={t.bestBid} value={f.usd(bid)} sub={bid === null ? t.none : undefined} />
        <StatTile label={t.lastSale} value={f.usd(lastUsd)} sub={lastAt ? <TimeAgo iso={lastAt} /> : undefined} />
        <StatTile
          label={t.avg7}
          value={f.usd(stored?.a7 ?? null)}
          sub={
            <span className="inline-flex items-center gap-1">
              <Delta value={stored ? nftWeeklyChange(stored) : null} /> <span className="text-muted">{ui.common.vsPrevWeek}</span>
            </span>
          }
        />
        <StatTile label={t.sold} value={<span className="tnum">{f.int(stored?.s7 ?? 0)}</span>} sub={t.in30(f.int(stored?.s30 ?? 0))} />
      </div>

      <section className="card p-4">
        <h2 className="font-display text-lg font-bold text-text">{t.chartTitle}</h2>
        <p className="mb-3 text-sm text-text-2">{t.chartHint}</p>
        <TimeSeriesChart
          ariaLabel={t.chartAria}
          yFormat={(v) => f.usd(v)}
          xFormat={f.shortDate}
          xFormatLong={f.dayTime}
          series={[
            {
              id: "avg",
              label: t.seriesAvg,
              color: "var(--series-1)",
              points: recentSales.map((r) => ({ x: r.x, y: r.avg })),
            },
            {
              id: "floor",
              label: t.seriesFloor,
              color: "var(--series-2)",
              points: floorPoints.filter((p) => p.x >= from),
            },
          ]}
        />
      </section>

      <section className="card p-4">
        <h2 className="font-display text-lg font-bold text-text">{t.salesTitle}</h2>
        <p className="mb-3 text-sm text-text-2">{t.salesHint}</p>
        <ColumnChart
          ariaLabel={t.salesTitle}
          points={recentSales.map((r) => ({ x: r.x, y: r.count }))}
          yFormat={(v) => f.int(v)}
          xFormat={f.shortDate}
          valueLabel={t.salesUnit}
        />
      </section>

      <section className="card p-4">
        <h2 className="mb-2 font-display text-lg font-bold text-text">{t.listingsTitle}</h2>
        {live && live.listings.length > 0 && <NextPrice listings={live.listings} />}
        {live && live.listings.length > 0 ? (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[30rem] text-sm">
              <thead className="text-left text-text-2">
                <tr className="border-b border-line">
                  <th className="py-2 pr-2 font-medium">{t.colRank}</th>
                  <th className="py-2 font-medium">{t.colPrice}</th>
                  <th className="py-2 font-medium">{t.colNative}</th>
                  <th className="py-2 text-right font-medium">{t.colDiff}</th>
                  <th className="py-2 text-right font-medium">{t.colTotal}</th>
                  <th className="py-2 text-right font-medium">{t.colToken}</th>
                </tr>
              </thead>
              <tbody className="tnum">
                {ladder(live.listings).map(({ l, rank, diff, total }) => (
                  <tr key={l.tokenId} className="border-b border-line/60 last:border-0">
                    <td className="py-1.5 pr-2 text-text-2">{rank}</td>
                    <td className="py-1.5 text-text">{f.usd(l.usd)}</td>
                    <td className="py-1.5 text-text-2">{l.native ? f.crypto(l.native.amount, l.native.symbol) : "—"}</td>
                    <td className="py-1.5 text-right text-text-2">{diff === null ? "—" : rank === 1 ? "" : f.pct(diff, true)}</td>
                    <td className="py-1.5 text-right text-text-2">{total === null ? "—" : f.usd(total)}</td>
                    <td className="py-1.5 text-right">
                      <a
                        className="text-accent hover:underline"
                        href={`https://explorer.immutable.com/token/${contract}/instance/${l.tokenId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        #{l.tokenId.slice(-6)}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">{status === "loading" ? ui.common.loading : t.noActive}</p>
        )}
        <p className="mt-2 text-xs text-muted">
          {t.listingsNote} {live && live.listings.length > 1 ? t.ladderNote : ""}
        </p>
      </section>
    </div>
  );
}
