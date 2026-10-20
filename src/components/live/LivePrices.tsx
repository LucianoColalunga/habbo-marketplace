"use client";

import { useEffect, useRef } from "react";
import { refreshLive, useLivePrice, useLiveStatus } from "@/lib/habbo/live-prices";
import type { FurniType } from "@/lib/habbo/api";
import type { HotelCode } from "@/lib/hotels";
import { useI18n } from "@/lib/i18n/client";
import { useNow } from "@/lib/use-now";
import { Credits } from "../ui";

/** Cada cuánto se vuelven a consultar los precios en pantalla, si la pestaña está a la vista. */
const AUTO_REFRESH_MS = 90_000;

/** Punto verde: este precio se consultó recién a Habbo. */
export function LiveDot() {
  const { t } = useI18n();
  return (
    <span title={t.livePrices.dot} className="inline-flex items-center">
      <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-up shadow-[0_0_6px_var(--up)]" />
      <span className="sr-only">{t.livePrices.dot}</span>
    </span>
  );
}

/** Aviso arriba de una lista: si los precios son en vivo, de cuándo, y un botón para actualizar. */
export function LiveStatusBar() {
  const { t, f } = useI18n();
  const live = useLiveStatus();
  const now = useNow();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refreshLive();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const l = t.livePrices;
  const text =
    live.state === "loading"
      ? l.loading
      : live.state === "limited"
        ? l.limited
        : live.state === "failed"
          ? l.failed
          : live.at
            ? `${l.ok} · ${l.updated(now ? f.relative(new Date(live.at).toISOString(), now) : f.dateTime(new Date(live.at).toISOString()))}`
            : l.loading;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-2" aria-live="polite">
      <span className="inline-flex items-center gap-2">
        <LiveDot />
        <span>{text}</span>
      </span>
      <span className="text-muted">{l.legend}</span>
      <button
        type="button"
        onClick={() => refreshLive()}
        disabled={live.state === "loading"}
        className="rounded-md border border-line px-2 py-0.5 text-text hover:bg-surface-2 disabled:opacity-50"
      >
        {l.refresh}
      </button>
    </div>
  );
}

/** Para las tablas de rankings: precio mínimo y ofertas, en vivo si se pudo. */
export function LivePriceCells({ hotel, k, t, cp, oo }: { hotel: string; k: string; t: FurniType; cp: number; oo: number }) {
  const { f } = useI18n();
  // Se mira la fila entera: en el celular la columna del precio puede quedar fuera de la
  // pantalla (la tabla se desliza de costado) y así igual se consulta.
  const row = useRef<HTMLTableRowElement | null>(null);
  const live = useLivePrice(hotel as HotelCode, k, t, row);
  const isLive = live !== undefined && live !== "missing";
  const price = isLive ? live.cp : cp;
  const offers = isLive ? live.oo : oo;
  return (
    <>
      <td
        ref={(td) => {
          row.current = td?.closest("tr") ?? null;
        }}
        className="px-3 py-2 text-right"
      >
        <span className="inline-flex items-center gap-1.5">
          {isLive && <LiveDot />}
          {offers > 0 ? <Credits value={price} /> : <span className="text-muted">—</span>}
        </span>
      </td>
      <td className="tnum px-3 py-2 text-right text-text-2">{f.int(offers)}</td>
    </>
  );
}
