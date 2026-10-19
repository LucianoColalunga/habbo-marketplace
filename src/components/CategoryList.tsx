"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CategoryRow } from "@/lib/data/views";
import { useI18n } from "@/lib/i18n/client";
import { normalizeText } from "@/lib/text";
import { FurniIcon } from "./FurniIcon";
import { Credits } from "./ui";

type Sort = "popular" | "cheap" | "expensive" | "name";

/** Grilla de furnis de una categoría, con orden y filtro por nombre (todo en el navegador). */
export function CategoryList({ hotel, rows }: { hotel: string; rows: CategoryRow[] }) {
  const { t: ui, f, href } = useI18n();
  const t = ui.catList;
  const [sort, setSort] = useState<Sort>("popular");
  const [filter, setFilter] = useState("");

  const shown = useMemo(() => {
    const q = normalizeText(filter);
    const list = q ? rows.filter((r) => normalizeText(r.n).includes(q)) : [...rows];
    const priced = (r: CategoryRow) => (r.oo > 0 ? r.cp : null);
    if (sort === "cheap") list.sort((a, b) => (priced(a) ?? Infinity) - (priced(b) ?? Infinity));
    if (sort === "expensive") list.sort((a, b) => (priced(b) ?? -1) - (priced(a) ?? -1));
    if (sort === "name") list.sort((a, b) => a.n.localeCompare(b.n));
    return list;
  }, [rows, sort, filter]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1" role="group" aria-label={t.sortAria}>
          {(["popular", "cheap", "expensive", "name"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={sort === s}
              onClick={() => setSort(s)}
              className={`rounded-lg px-3 py-1.5 text-sm ${sort === s ? "bg-surface-3 text-text" : "text-text-2 hover:bg-surface-2"}`}
            >
              {t[s]}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t.filter}
          aria-label={t.filterAria}
          className="ml-auto w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-text placeholder:text-muted sm:w-64"
        />
      </div>
      {shown.length === 0 ? (
        <p className="card p-6 text-center text-sm text-muted">{t.none}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((r) => (
            <li key={r.k}>
              <Link
                prefetch={false}
                href={href(`/${hotel}/furni/${encodeURIComponent(r.k)}`)}
                className="card flex items-center gap-3 p-3 hover:bg-surface-2"
              >
                <FurniIcon k={r.k} r={r.r} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-text">{r.n}</span>
                  <span className="block text-xs text-text-2">
                    {r.oo > 0 ? (
                      <>
                        {ui.common.from} <Credits value={r.cp} /> · {ui.common.forSale(f.int(r.oo))}
                      </>
                    ) : (
                      ui.common.noOffers
                    )}
                  </span>
                  <span className="block text-xs text-muted">{r.s30 > 0 ? t.sold30(f.int(r.s30)) : t.noMarket}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
