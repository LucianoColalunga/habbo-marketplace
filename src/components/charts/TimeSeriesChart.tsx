"use client";

import { useMemo, useState } from "react";
import { linear, nearestIndex, niceTicks } from "./scale";
import { useWidth } from "./useWidth";

export interface SeriesPoint {
  x: number;
  y: number;
}

export interface Series {
  id: string;
  label: string;
  color: string;
  points: SeriesPoint[];
}

interface Props {
  series: Series[];
  ariaLabel: string;
  height?: number;
  yFormat: (v: number) => string;
  xFormat: (ms: number) => string;
  /** Formato largo de fecha para el tooltip. */
  xFormatLong?: (ms: number) => string;
  includeZero?: boolean;
  /** Distancia máxima (ms) para considerar que una serie tiene valor en la fecha señalada. */
  matchWindowMs?: number;
}

const M = { top: 12, right: 16, bottom: 26 };

/**
 * Gráfico de líneas con cruz y tooltip. Un solo eje Y (todas las series en la
 * misma unidad). Líneas de 2 px, grilla tenue, leyenda si hay 2 o más series.
 */
export function TimeSeriesChart({
  series,
  ariaLabel,
  height = 240,
  yFormat,
  xFormat,
  xFormatLong,
  includeZero = false,
  matchWindowMs = 12 * 3600_000,
}: Props) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const visible = series.filter((s) => s.points.length > 0);

  const layout = useMemo(() => {
    const xs = [...new Set(visible.flatMap((s) => s.points.map((p) => p.x)))].sort((a, b) => a - b);
    const ys = visible.flatMap((s) => s.points.map((p) => p.y));
    if (xs.length === 0) return null;
    const ticks = niceTicks(Math.min(...ys), Math.max(...ys), 4, includeZero);
    const labelWidth = Math.max(...ticks.map((t) => yFormat(t).length)) * 7 + 14;
    const left = Math.max(36, labelWidth);
    let x0 = xs[0];
    let x1 = xs[xs.length - 1];
    if (x0 === x1) {
      x0 -= 86_400_000;
      x1 += 86_400_000;
    }
    const sx = linear([x0, x1], [left, width - M.right]);
    const sy = linear([ticks[0], ticks[ticks.length - 1]], [height - M.bottom, M.top]);
    const xTickCount = Math.max(2, Math.min(6, Math.floor((width - left) / 90)));
    const xTicks = Array.from({ length: xTickCount }, (_, i) => x0 + ((x1 - x0) * i) / (xTickCount - 1));
    return { xs, ticks, left, sx, sy, xTicks };
  }, [visible, width, height, includeZero, yFormat]);

  if (!layout) {
    return <div className="flex h-40 items-center justify-center text-sm text-muted">Sin datos para graficar.</div>;
  }
  const { xs, ticks, left, sx, sy, xTicks } = layout;
  const hoverX = hover !== null ? xs[hover] : null;

  const valueAt = (s: Series, x: number) => {
    const idx = nearestIndex(
      s.points.map((p) => p.x),
      x,
    );
    const p = s.points[idx];
    return p && Math.abs(p.x - x) <= matchWindowMs ? p : null;
  };

  const onMove = (clientX: number, rect: DOMRect) => {
    const px = clientX - rect.left;
    const positions = xs.map((x) => sx(x));
    setHover(nearestIndex(positions, px));
  };

  return (
    <div>
      {visible.length >= 2 && (
        <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-2" aria-label="Leyenda">
          {visible.map((s) => (
            <li key={s.id} className="flex items-center gap-2">
              <span aria-hidden="true" className="inline-block h-0.5 w-4 rounded" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      <div ref={ref} className="relative select-none">
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={ariaLabel}
          tabIndex={0}
          className="block touch-pan-y outline-none"
          onPointerMove={(e) => onMove(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerDown={(e) => onMove(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerLeave={() => setHover(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? xs.length) - 1));
            if (e.key === "ArrowRight") setHover((h) => Math.min(xs.length - 1, (h ?? -1) + 1));
            if (e.key === "Escape") setHover(null);
          }}
          onBlur={() => setHover(null)}
        >
          {ticks.map((t, i) => (
            <g key={t}>
              <line
                x1={left}
                x2={width - M.right}
                y1={sy(t)}
                y2={sy(t)}
                stroke={i === 0 ? "var(--axis)" : "var(--grid)"}
                strokeWidth="1"
                shapeRendering="crispEdges"
              />
              <text x={left - 8} y={sy(t)} dy="0.32em" textAnchor="end" className="tnum fill-muted text-[11px]">
                {yFormat(t)}
              </text>
            </g>
          ))}
          {xTicks.map((t, i) => (
            <text
              key={t}
              x={sx(t)}
              y={height - 8}
              textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
              className="fill-muted text-[11px]"
            >
              {xFormat(t)}
            </text>
          ))}
          {hoverX !== null && (
            <line x1={sx(hoverX)} x2={sx(hoverX)} y1={M.top} y2={height - M.bottom} stroke="var(--axis)" strokeWidth="1" />
          )}
          {visible.map((s) => {
            const d = s.points.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join("");
            const sparse = s.points.length <= 12;
            const last = s.points[s.points.length - 1];
            return (
              <g key={s.id}>
                {s.points.length > 1 && (
                  <path d={d} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                )}
                {(sparse ? s.points : [last]).map((p) => (
                  <circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r="4" fill={s.color} stroke="var(--surface)" strokeWidth="2" />
                ))}
                {hoverX !== null &&
                  (() => {
                    const p = valueAt(s, hoverX);
                    return p ? <circle cx={sx(p.x)} cy={sy(p.y)} r="5" fill={s.color} stroke="var(--surface)" strokeWidth="2" /> : null;
                  })()}
              </g>
            );
          })}
        </svg>
        {hoverX !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 min-w-36 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs shadow-xl shadow-black/40"
            style={{
              left: Math.min(Math.max(sx(hoverX) + 12, 0), width - 160),
            }}
            role="status"
          >
            <div className="mb-1 text-text-2">{(xFormatLong ?? xFormat)(hoverX)}</div>
            {visible.map((s) => {
              const p = valueAt(s, hoverX);
              return (
                <div key={s.id} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-text-2">
                    <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <span className="tnum font-medium text-text">{p ? yFormat(p.y) : "—"}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
