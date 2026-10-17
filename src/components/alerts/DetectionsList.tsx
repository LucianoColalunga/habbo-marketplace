"use client";

import Link from "next/link";
import { clearDetections, loadDetections, useLocal, type Detection } from "@/lib/alerts/local";
import { HOTELS, type HotelCode } from "@/lib/hotels";
import { formatPct } from "@/lib/format";
import { TimeAgo } from "@/components/Freshness";

const NONE: Detection[] = [];

/** Ofertas que encontró el vigilante para la lista personal (guardadas en este navegador). */
export function DetectionsList({ compact = false }: { compact?: boolean }) {
  const detections = useLocal(loadDetections, NONE);
  if (detections.length === 0) {
    return (
      <p className="text-sm text-muted">
        Todavía no se detectó nada para tu lista. Las detecciones aparecen acá cuando un furni que vigilás cumple tu condición.
      </p>
    );
  }
  return (
    <div>
      <ul className="divide-y divide-line/70">
        {detections.slice(0, compact ? 5 : 100).map((d) => (
          <li key={d.id} className="flex flex-wrap items-baseline gap-x-2 py-2 text-sm">
            <Link className="text-text hover:underline" href={`/${d.hotel}/furni/${encodeURIComponent(d.item)}`}>
              {d.name}
            </Link>
            <span className="text-text-2">
              a <strong className="tnum text-text">{d.price}</strong> créditos en {HOTELS[d.hotel as HotelCode]?.label ?? d.hotel}
              {d.belowRef !== null ? ` · ${formatPct(d.belowRef, false)} bajo el promedio` : ""} · {d.offers} en venta
            </span>
            <span className="ml-auto text-xs text-muted">
              <TimeAgo iso={new Date(d.at).toISOString()} />
            </span>
          </li>
        ))}
      </ul>
      {!compact && (
        <button type="button" onClick={clearDetections} className="mt-2 text-sm text-text-2 hover:text-text">
          Borrar historial de detecciones
        </button>
      )}
    </div>
  );
}
