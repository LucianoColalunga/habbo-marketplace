"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { FurniRow } from "@/lib/data/rankings";
import { fetchLive, LiveLimitError } from "@/lib/habbo/live-client";
import type { HotelCode } from "@/lib/hotels";
import { useI18n } from "@/lib/i18n/client";
import { FurniIcon } from "@/components/FurniIcon";
import { Credits } from "@/components/ui";

type LiveState = { cp: number; oo: number } | "missing";
type Note = "" | "someSkipped" | "limit" | "failed";

export function DealsTable({ hotel, rows }: { hotel: HotelCode; rows: FurniRow[] }) {
  const { t: ui, f, href } = useI18n();
  const t = ui.deals;
  const [sort, setSort] = useState<"pct" | "saving">("pct");
  const [live, setLive] = useState<Record<string, LiveState>>({});
  const [checking, setChecking] = useState(false);
  const [note, setNote] = useState<Note>("");

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) =>
        sort === "pct"
          ? (b.pct ?? 0) - (a.pct ?? 0)
          : (b.ref ?? 0) - b.cp - ((a.ref ?? 0) - a.cp),
      ),
    [rows, sort],
  );

  const verify = async () => {
    setChecking(true);
    setNote("");
    const top = sorted.slice(0, 50);
    try {
      const res = await fetchLive(
        hotel,
        top.map((r) => ({ name: r.k, type: r.t })),
        { force: true },
      );
      const next: Record<string, LiveState> = {};
      for (const r of top) {
        const s = res.stats.get(r.k);
        if (s) next[r.k] = { cp: s.currentPrice, oo: s.currentOpenOffers };
        else if (!res.skipped.includes(r.k)) next[r.k] = "missing";
      }
      setLive(next);
      setNote(res.skipped.length ? "someSkipped" : "");
    } catch (error) {
      setNote(error instanceof LiveLimitError ? "limit" : "failed");
    } finally {
      setChecking(false);
    }
  };

  if (rows.length === 0) {
    return <p className="card p-8 text-center text-sm text-muted">{t.empty}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1" role="group" aria-label={t.sortAria}>
          {(
            [
              ["pct", t.sortPct],
              ["saving", t.sortSaving],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={sort === id}
              onClick={() => setSort(id)}
              className={`rounded-lg px-3 py-1.5 text-sm ${sort === id ? "bg-surface-3 text-text" : "text-text-2 hover:bg-surface-2"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void verify()}
          disabled={checking}
          className="ml-auto rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink disabled:opacity-60"
        >
          {checking ? t.verifying : t.verify}
        </button>
      </div>
      {note && <p className="text-sm text-text-2">{t[note]}</p>}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-text-2">
            <tr className="border-b border-line">
              <th className="px-3 py-2 font-medium">{t.colFurni}</th>
              <th className="px-3 py-2 text-right font-medium">{t.colMin}</th>
              <th className="px-3 py-2 text-right font-medium">{t.colRecent}</th>
              <th className="px-3 py-2 text-right font-medium">{t.colBelow}</th>
              <th className="px-3 py-2 text-right font-medium">{t.colSold30}</th>
              <th className="px-3 py-2 font-medium">{t.colNow}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const l = live[row.k];
              return (
                <tr key={row.k} className="border-b border-line/60 last:border-0 hover:bg-surface-2/60">
                  <td className="px-3 py-2">
                    <Link prefetch={false} href={href(`/${hotel}/furni/${encodeURIComponent(row.k)}`)} className="flex items-center gap-3">
                      <FurniIcon k={row.k} r={row.r} size={36} />
                      <span className="truncate text-text hover:underline">{row.n}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Credits value={row.cp} />
                  </td>
                  <td className="px-3 py-2 text-right text-text-2">
                    <Credits value={row.ref} />
                  </td>
                  <td className="tnum px-3 py-2 text-right font-medium text-up">−{f.pct(row.pct ?? null, false)}</td>
                  <td className="tnum px-3 py-2 text-right text-text-2">{f.int(row.s30)}</td>
                  <td className="px-3 py-2 text-text-2">
                    {l === undefined && <span className="text-muted">—</span>}
                    {l === "missing" && <span>{t.noData}</span>}
                    {l && l !== "missing" && l.oo === 0 && <span>{t.gone}</span>}
                    {l && l !== "missing" && l.oo > 0 && l.cp <= row.cp && <span className="text-up">{t.still(f.int(l.cp))}</span>}
                    {l && l !== "missing" && l.oo > 0 && l.cp > row.cp && <span>{t.up(f.int(l.cp))}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
