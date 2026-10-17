"use client";

import Link from "next/link";
import { clearDetections, loadDetections, useLocal, type Detection } from "@/lib/alerts/local";
import { HOTELS, type HotelCode } from "@/lib/hotels";
import { useI18n } from "@/lib/i18n/client";
import { TimeAgo } from "@/components/Freshness";

const NONE: Detection[] = [];

/** Ofertas que encontró el vigilante para la lista personal (guardadas en este navegador). */
export function DetectionsList({ compact = false }: { compact?: boolean }) {
  const { t: ui, f, href } = useI18n();
  const t = ui.detections;
  const detections = useLocal(loadDetections, NONE);
  if (detections.length === 0) {
    return <p className="text-sm text-muted">{t.empty}</p>;
  }
  return (
    <div>
      <ul className="divide-y divide-line/70">
        {detections.slice(0, compact ? 5 : 100).map((d) => (
          <li key={d.id} className="flex flex-wrap items-baseline gap-x-2 py-2 text-sm">
            <Link prefetch={false} className="text-text hover:underline" href={href(`/${d.hotel}/furni/${encodeURIComponent(d.item)}`)}>
              {d.name}
            </Link>
            <span className="text-text-2">
              {t.at} <strong className="tnum text-text">{d.price}</strong> {t.creditsIn(HOTELS[d.hotel as HotelCode]?.label ?? d.hotel)}
              {d.belowRef !== null ? ` · ${t.belowAvg(f.pct(d.belowRef, false))}` : ""} · {ui.common.forSale(f.int(d.offers))}
            </span>
            <span className="ml-auto text-xs text-muted">
              <TimeAgo iso={new Date(d.at).toISOString()} />
            </span>
          </li>
        ))}
      </ul>
      {!compact && (
        <button type="button" onClick={clearDetections} className="mt-2 text-sm text-text-2 hover:text-text">
          {t.clear}
        </button>
      )}
    </div>
  );
}
