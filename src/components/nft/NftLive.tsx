"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IMX_BASE, normalizeStack, type NftStack } from "@/lib/nft/api";
import type { NftDayPoint, NftRow, NftSnapPoint } from "@/lib/nft/model";
import { nftWeeklyChange } from "@/lib/nft/rankings";
import { dateNumToMs } from "@/lib/market/history";
import { formatCrypto, formatInt, formatShortDate, formatUsd } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { Delta, StatTile } from "@/components/ui";
import { TimeAgo } from "@/components/Freshness";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { ColumnChart } from "@/components/charts/ColumnChart";

interface Listing {
  tokenId: string;
  usd: number | null;
  native: string | null;
}

interface LiveData {
  stack: NftStack;
  listings: Listing[];
  at: number;
}

type Status = "loading" | "live" | "error";

interface RawLive {
  listings?: { token_id?: string; price_details?: { converted_prices?: { USD?: string }; fee_inclusive_amount?: string; token?: { decimals?: number; symbol?: string } } }[];
}

async function fetchLiveStack(id: string): Promise<LiveData | null> {
  const res = await fetch(`${IMX_BASE}/stacks?stack_id=${id}`, { mode: "cors", credentials: "omit" });
  if (!res.ok) throw new Error(`Immutable respondió ${res.status}`);
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
      native: amount !== null && Number.isFinite(amount) ? formatCrypto(amount, p?.token?.symbol ?? "") : null,
    };
  });
  listings.sort((a, b) => (a.usd ?? Infinity) - (b.usd ?? Infinity));
  return { stack, listings, at: Date.now() };
}

const longDate = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

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

  const salesRows = useMemo(() => days.map(([date, count, usd]) => ({ x: dateNumToMs(date), count, avg: count ? usd / count : 0 })), [days]);
  const floorPoints = useMemo(() => {
    const pts = snaps.map(([min, f]) => ({ x: min * 60_000, y: f }));
    if (live?.stack.floorUsd !== null && live?.stack.floorUsd !== undefined) pts.push({ x: live.at, y: live.stack.floorUsd });
    return pts;
  }, [snaps, live]);
  const from = now ? now - 30 * 86_400_000 : 0;
  const recentSales = salesRows.filter((r) => r.x >= from);

  return (
    <div className="space-y-6">
      <div className="text-sm text-text-2" aria-live="polite">
        {status === "loading" && "Consultando Immutable…"}
        {status === "live" && live && (
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-up" aria-hidden="true" />
            En vivo · consultado <TimeAgo iso={new Date(live.at).toISOString()} />
          </span>
        )}
        {status === "error" && "No se pudo consultar Immutable desde tu navegador; se muestra el último escaneo."}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile
          label="Precio piso"
          value={formatUsd(floor)}
          sub={floorNative ? formatCrypto(floorNative.amount, floorNative.symbol) : "sin publicaciones"}
          help="La publicación más barata, con comisiones incluidas."
        />
        <StatTile label="Mejor oferta de compra" value={formatUsd(bid)} sub={bid === null ? "ninguna" : undefined} />
        <StatTile
          label="Última venta"
          value={formatUsd(lastUsd)}
          sub={lastAt ? <TimeAgo iso={lastAt} /> : undefined}
        />
        <StatTile
          label="Promedio 7 días"
          value={formatUsd(stored?.a7 ?? null)}
          sub={
            <span className="inline-flex items-center gap-1">
              <Delta value={stored ? nftWeeklyChange(stored) : null} /> <span className="text-muted">vs. semana anterior</span>
            </span>
          }
        />
        <StatTile
          label="Vendidos"
          value={<span className="tnum">{formatInt(stored?.s7 ?? 0)}</span>}
          sub={`${formatInt(stored?.s30 ?? 0)} en 30 días`}
        />
      </div>

      <section className="card p-4">
        <h2 className="font-display text-lg font-bold text-text">Precio a lo largo del tiempo (USD)</h2>
        <p className="mb-3 text-sm text-text-2">Promedio de venta por día y precio piso en cada escaneo (guardado por este sitio).</p>
        <TimeSeriesChart
          ariaLabel="Precio promedio de venta por día y precio piso"
          yFormat={(v) => formatUsd(v)}
          xFormat={formatShortDate}
          xFormatLong={(ms) => longDate.format(ms)}
          series={[
            { id: "avg", label: "Promedio de venta del día", color: "var(--series-1)", points: recentSales.map((r) => ({ x: r.x, y: r.avg })) },
            { id: "floor", label: "Precio piso", color: "var(--series-2)", points: floorPoints.filter((p) => p.x >= from) },
          ]}
        />
      </section>

      <section className="card p-4">
        <h2 className="font-display text-lg font-bold text-text">Ventas por día</h2>
        <p className="mb-3 text-sm text-text-2">Ventas en el marketplace de Immutable, contadas por este sitio.</p>
        <ColumnChart
          ariaLabel="Ventas por día"
          points={recentSales.map((r) => ({ x: r.x, y: r.count }))}
          yFormat={(v) => formatInt(v)}
          xFormat={formatShortDate}
          valueLabel="ventas"
        />
      </section>

      <section className="card p-4">
        <h2 className="mb-2 font-display text-lg font-bold text-text">Publicaciones más baratas</h2>
        {live && live.listings.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="text-left text-text-2">
              <tr className="border-b border-line">
                <th className="py-2 font-medium">Precio</th>
                <th className="py-2 font-medium">En su moneda</th>
                <th className="py-2 text-right font-medium">Token</th>
              </tr>
            </thead>
            <tbody className="tnum">
              {live.listings.map((l) => (
                <tr key={l.tokenId} className="border-b border-line/60 last:border-0">
                  <td className="py-1.5 text-text">{formatUsd(l.usd)}</td>
                  <td className="py-1.5 text-text-2">{l.native ?? "—"}</td>
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
        ) : (
          <p className="text-sm text-muted">{status === "loading" ? "Cargando…" : "No hay publicaciones activas en este momento."}</p>
        )}
        <p className="mt-2 text-xs text-muted">Se muestran hasta 10 publicaciones, con comisiones incluidas.</p>
      </section>
    </div>
  );
}
