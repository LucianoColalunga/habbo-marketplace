"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MarketStats } from "@/lib/habbo/api";
import { fetchLive, LiveLimitError } from "@/lib/habbo/live-client";
import type { HotelCode } from "@/lib/hotels";
import type { DayPoint, SnapPoint } from "@/lib/market/history";
import { lastDays, mergeDayRows, snapRows } from "@/lib/market/series";
import { referencePrice, summarize, weeklyChange, type ItemSummary } from "@/lib/market/stats";
import { formatCompact, formatInt, formatPrice, formatShortDate } from "@/lib/format";
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

interface Outcome {
  status: Status;
  live?: { stats: MarketStats; at: number };
  message: string;
}

const RANGES = [
  { id: 30, label: "30 días" },
  { id: 90, label: "90 días" },
  { id: Number.POSITIVE_INFINITY, label: "Todo" },
] as const;

const longDate = new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const longDateTime = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function ItemLive({ hotel, k, t, stored, storedAt, days, snaps }: Props) {
  const [live, setLive] = useState<{ stats: MarketStats; at: number } | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string>("");
  const [range, setRange] = useState<number>(30);
  const [showTable, setShowTable] = useState(false);
  // "Ahora" se toma recién en el navegador (no durante el render del servidor).
  const now = useNow() ?? 0;

  /** Consulta en vivo y devuelve qué mostrar (sin tocar el estado). */
  const query = useCallback(
    async (force: boolean): Promise<Outcome> => {
      try {
        const res = await fetchLive(hotel, [{ name: k, type: t }], { force });
        const stats = res.stats.get(k);
        if (stats) return { status: "live", live: { stats, at: res.fetchedAt }, message: "" };
        if (res.skipped.length) {
          return { status: "limited", message: "Se alcanzó el límite de consultas en vivo. Esperá un minuto y tocá Actualizar." };
        }
        return { status: "error", message: "La API no devolvió datos para este furni en este momento." };
      } catch (error) {
        return error instanceof LiveLimitError
          ? { status: "limited", message: "Habbo limita las consultas seguidas. Mostramos el último dato guardado; probá de nuevo en un minuto." }
          : { status: "error", message: "No se pudo consultar la API de Habbo desde tu navegador. Mostramos el último dato guardado." };
      }
    },
    [hotel, k, t],
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
          {status === "loading" && "Consultando la API de Habbo…"}
          {status === "live" && live && (
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-up" aria-hidden="true" />
              En vivo · consultado <TimeAgo iso={new Date(live.at).toISOString()} />
            </span>
          )}
          {(status === "limited" || status === "error") && (
            <span>
              {message} {storedAt && <>Último escaneo: <TimeAgo iso={storedAt} />.</>}
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
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile
          label="Precio mínimo publicado"
          value={current && current.oo > 0 ? <Credits value={current.cp} /> : <span className="text-muted">sin ofertas</span>}
          help="La oferta más barata abierta en este momento."
        />
        <StatTile label="Ofertas abiertas" value={<span className="tnum">{formatInt(current?.oo ?? 0)}</span>} />
        <StatTile
          label="Promedio 7 días"
          value={<Credits value={current?.a7 ?? null} />}
          sub={
            <span className="inline-flex items-center gap-1">
              <Delta value={change} /> <span className="text-muted">vs. semana anterior</span>
            </span>
          }
        />
        <StatTile
          label="Promedio 30 días"
          value={<Credits value={current?.a30 ?? (current?.ap || null)} />}
          sub={current?.ap ? <span>Habbo informa {formatPrice(current.ap)}</span> : undefined}
        />
        <StatTile
          label="Vendidos en 30 días"
          value={<span className="tnum">{formatInt(current?.s30 ?? 0)}</span>}
          sub={current?.ls ? <span>última venta hace {current.ls} día{current.ls === 1 ? "" : "s"}</span> : undefined}
        />
      </div>

      {ref !== null && current && current.oo > 0 && current.cp < ref && (
        <p className="text-sm text-text-2">
          El precio mínimo está <strong className="text-text">{Math.round(((ref - current.cp) / ref) * 100)} %</strong> por
          debajo del promedio reciente ({formatPrice(ref)} créditos).
        </p>
      )}

      <section className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold text-text">Precio a lo largo del tiempo</h2>
            <p className="text-sm text-text-2">
              Promedio de venta por día (Habbo) y precio mínimo publicado en cada escaneo (guardado por este sitio).
            </p>
          </div>
          <div className="flex gap-1" role="group" aria-label="Rango del gráfico">
            {RANGES.map((r) => (
              <button
                key={r.label}
                type="button"
                aria-pressed={range === r.id}
                onClick={() => setRange(r.id)}
                className={`rounded-lg px-3 py-1 text-sm ${range === r.id ? "bg-surface-3 text-text" : "text-text-2 hover:bg-surface-2"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <TimeSeriesChart
          ariaLabel="Precio promedio de venta por día y precio mínimo publicado"
          yFormat={(v) => formatCompact(v)}
          xFormat={formatShortDate}
          xFormatLong={(ms) => longDateTime.format(ms)}
          series={[
            { id: "avg", label: "Promedio de venta del día", color: "var(--series-1)", points: visibleRows.map((r) => ({ x: r.x, y: r.avg })) },
            { id: "min", label: "Precio mínimo publicado", color: "var(--series-2)", points: visibleSnaps.map((s) => ({ x: s.x, y: s.cp })) },
          ]}
        />
      </section>

      <section className="card p-4">
        <h2 className="font-display text-lg font-bold text-text">Unidades vendidas por día</h2>
        <p className="mb-3 text-sm text-text-2">Solo cuentan las ventas hechas en el Marketplace.</p>
        <ColumnChart
          ariaLabel="Unidades vendidas por día"
          points={visibleRows.map((r) => ({ x: r.x, y: r.sold }))}
          yFormat={(v) => formatCompact(v)}
          xFormat={formatShortDate}
          valueLabel="vendidos"
        />
      </section>

      <section>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-expanded={showTable}
          className="text-sm text-accent hover:underline"
        >
          {showTable ? "Ocultar tabla de datos" : "Ver los datos en una tabla"}
        </button>
        {showTable && (
          <div className="card mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Historial diario</caption>
              <thead className="text-left text-text-2">
                <tr className="border-b border-line">
                  <th className="px-4 py-2 font-medium">Día</th>
                  <th className="px-4 py-2 text-right font-medium">Promedio</th>
                  <th className="px-4 py-2 text-right font-medium">Vendidos</th>
                  <th className="px-4 py-2 text-right font-medium">Ofertas ese día</th>
                </tr>
              </thead>
              <tbody className="tnum">
                {[...visibleRows].reverse().map((r) => (
                  <tr key={r.x} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-1.5 text-text-2">{longDate.format(r.x)}</td>
                    <td className="px-4 py-1.5 text-right text-text">{formatPrice(r.avg)}</td>
                    <td className="px-4 py-1.5 text-right text-text">{formatInt(r.sold)}</td>
                    <td className="px-4 py-1.5 text-right text-text">{formatInt(r.offers)}</td>
                  </tr>
                ))}
                {visibleRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-center text-muted">
                      Sin ventas en este período.
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
