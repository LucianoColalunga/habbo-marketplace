"use client";

import { useMemo, useState } from "react";
import { niceTicks } from "./scale";
import { useWidth } from "./useWidth";

interface Props {
  /** Un valor por día; x = medianoche UTC del día. */
  points: { x: number; y: number }[];
  ariaLabel: string;
  color?: string;
  height?: number;
  yFormat: (v: number) => string;
  xFormat: (ms: number) => string;
  valueLabel: string;
}

const DAY = 86_400_000;
const M = { top: 12, right: 16, bottom: 26 };

/** Columnas por día: ancho máximo 24 px, punta redondeada de 4 px y base recta. */
export function ColumnChart({ points, ariaLabel, color = "var(--series-1)", height = 180, yFormat, xFormat, valueLabel }: Props) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const layout = useMemo(() => {
    if (points.length === 0) return null;
    const first = Math.min(...points.map((p) => p.x));
    const last = Math.max(...points.map((p) => p.x));
    const days = Math.round((last - first) / DAY) + 1;
    const byDay = new Map(points.map((p) => [Math.round((p.x - first) / DAY), p.y]));
    const ticks = niceTicks(0, Math.max(...points.map((p) => p.y)), 4, true);
    const left = Math.max(36, Math.max(...ticks.map((t) => yFormat(t).length)) * 7 + 14);
    const band = (width - left - M.right) / days;
    const barW = Math.max(2, Math.min(24, band - 2));
    const top = ticks[ticks.length - 1] || 1;
    const sy = (v: number) => height - M.bottom - (v / top) * (height - M.bottom - M.top);
    return { first, days, byDay, ticks, left, band, barW, sy };
  }, [points, width, height, yFormat]);

  if (!layout) return <div className="flex h-32 items-center justify-center text-sm text-muted">Sin ventas registradas.</div>;
  const { first, days, byDay, ticks, left, band, barW, sy } = layout;
  const base = sy(0);
  const labelStep = Math.max(1, Math.ceil(days / Math.max(2, Math.floor((width - left) / 70))));

  return (
    <div ref={ref} className="relative select-none">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={ariaLabel}
        className="block touch-pan-y"
        onPointerLeave={() => setHover(null)}
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
        {Array.from({ length: days }, (_, d) => {
          const value = byDay.get(d) ?? 0;
          const cx = left + band * d + band / 2;
          const y = sy(value);
          const h = base - y;
          const x = cx - barW / 2;
          const r = Math.min(4, barW / 2, h);
          const path =
            h > 0
              ? `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + barW - r}Q${x + barW},${y} ${x + barW},${y + r}V${base}Z`
              : "";
          return (
            <g key={d}>
              {path && <path d={path} fill={color} opacity={hover === null || hover === d ? 1 : 0.55} />}
              <rect
                x={left + band * d}
                y={M.top}
                width={band}
                height={height - M.top - M.bottom}
                fill="transparent"
                onPointerEnter={() => setHover(d)}
                onPointerDown={() => setHover(d)}
              />
              {d % labelStep === 0 && (
                <text x={cx} y={height - 8} textAnchor="middle" className="fill-muted text-[11px]">
                  {xFormat(first + d * DAY)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs shadow-xl shadow-black/40"
          style={{ left: Math.min(Math.max(left + band * hover + band / 2 + 10, 0), width - 140) }}
          role="status"
        >
          <div className="text-text-2">{xFormat(first + hover * DAY)}</div>
          <div className="tnum font-medium text-text">
            {yFormat(byDay.get(hover) ?? 0)} {valueLabel}
          </div>
        </div>
      )}
    </div>
  );
}
