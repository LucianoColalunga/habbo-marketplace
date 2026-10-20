"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { CATALOG_VIEWS, catalogView, DEFAULT_VIEW, setCatalogView, subscribeCatalogView, type CatalogView } from "@/lib/catalog-view";
import type { CategoryRow } from "@/lib/data/views";
import { useLivePrice } from "@/lib/habbo/live-prices";
import type { HotelCode } from "@/lib/hotels";
import { useI18n } from "@/lib/i18n/client";
import { normalizeText } from "@/lib/text";
import { LiveDot, LiveStatusBar } from "../live/LivePrices";
import { Credits } from "../ui";
import { PixelFurni } from "./PixelFurni";

/**
 * Catálogo estilo tienda: a la izquierda los filtros y el árbol de categorías,
 * a la derecha los furnis con imágenes grandes, medianas, chicas o en lista.
 * Todo el filtrado y el orden pasan en el navegador (sin pedidos nuevos).
 */

export interface CatalogNode {
  slug: string;
  label: string;
  count: number;
  subs: { slug: string; label: string; count: number }[];
}

type Sort = "popular" | "cheap" | "expensive" | "name";

const PAGE: Record<CatalogView, number> = { big: 24, medium: 32, small: 48, list: 40 };
const GRID: Record<Exclude<CatalogView, "list">, string> = {
  big: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
  medium: "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4",
  small: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
};
/** Cuánto se agranda el ícono (como máximo) en cada vista. */
const SCALE: Record<CatalogView, number> = { big: 6, medium: 5, small: 3, list: 2 };
const TILE_BG = { backgroundImage: "radial-gradient(circle at 50% 45%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 68%)" };
const box = "rounded-[14px] border border-line bg-surface transition-colors hover:border-accent/60";

function useView(): CatalogView {
  return useSyncExternalStore(subscribeCatalogView, catalogView, () => DEFAULT_VIEW);
}

/** Íconos del selector: tantas columnas como muestra cada vista. */
function ViewIcon({ view }: { view: CatalogView }) {
  if (view === "list") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        {[5, 12, 19].map((y) => (
          <g key={y} fill="currentColor">
            <rect x="2" y={y - 2} width="4" height="4" rx="0.5" />
            <rect x="8" y={y - 1} width="14" height="2" rx="0.5" />
          </g>
        ))}
      </svg>
    );
  }
  const n = view === "big" ? 3 : view === "medium" ? 4 : 5;
  const gap = 1.2;
  const cell = (22 - gap * (n - 1)) / n;
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      {Array.from({ length: n * (n - 1) }, (_, i) => (
        <rect
          key={i}
          x={1 + (i % n) * (cell + gap)}
          y={1 + Math.floor(i / n) * (cell + gap) + (24 - 2 - (n - 1) * cell - (n - 2) * gap) / 2}
          width={cell}
          height={cell}
          rx="0.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}

function Check({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border ${on ? "border-accent bg-accent text-accent-ink" : "border-text-2/50"}`}
    >
      {on && (
        <svg viewBox="0 0 16 16" className="h-3 w-3">
          <path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

function Sidebar({
  hotel,
  tree,
  cat,
  sub,
  filter,
  onFilter,
}: {
  hotel: string;
  tree: CatalogNode[];
  cat: string | null;
  sub: string | null;
  filter: string;
  onFilter: (v: string) => void;
}) {
  const { t: ui, f, href } = useI18n();
  const t = ui.catalog;
  const [shown, setShown] = useState(false);
  const [open, setOpen] = useState<Set<string>>(() => new Set(cat ? [cat] : []));
  const base = `/${hotel}/categorias`;
  const node = tree.find((n) => n.slug === cat);
  const subNode = node?.subs.find((s) => s.slug === sub);
  const toggle = (slug: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  const chip = (label: string, to: string) => (
    <Link
      prefetch={false}
      href={href(to)}
      aria-label={t.remove(label)}
      className="inline-flex max-w-full items-center gap-2 rounded-lg bg-surface-3 px-3 py-1.5 text-sm text-text hover:bg-surface-2"
    >
      <span className="truncate">{label}</span>
      <span aria-hidden="true">✕</span>
    </Link>
  );
  const item = (label: string, count: number | null, to: string, on: boolean, nested = false) => (
    <Link
      prefetch={false}
      href={href(to)}
      aria-current={on ? "page" : undefined}
      className={`flex min-w-0 flex-1 items-center gap-3 py-1.5 ${nested ? "text-sm" : ""} ${on ? "text-text" : "text-text-2 hover:text-text"}`}
    >
      <Check on={on} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== null && <span className="tnum text-xs text-muted">{f.int(count)}</span>}
    </Link>
  );

  return (
    <aside className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-2">
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-expanded={shown}
        aria-controls="catalog-filters"
        className="flex w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-text lg:hidden"
      >
        <FilterIcon />
        {shown ? t.hideFilters : t.showFilters}
      </button>
      <div id="catalog-filters" className={`${shown ? "block" : "hidden"} mt-3 space-y-5 lg:mt-0 lg:block`}>
        <div className="hidden items-center gap-2 border-b border-line pb-3 text-lg text-text-2 lg:flex">
          <FilterIcon />
          {t.filter}
        </div>
        <input
          type="search"
          value={filter}
          onChange={(e) => onFilter(e.target.value)}
          placeholder={t.searchHere}
          aria-label={ui.catList.filterAria}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text placeholder:text-muted"
        />
        {node && (
          <section className="space-y-3 border-b border-line pb-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display font-bold text-text">{t.selected}</h2>
              <Link prefetch={false} href={href(base)} className="text-sm text-accent hover:underline">
                {t.clear}
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {chip(node.label, base)}
              {subNode && chip(subNode.label, `${base}/${node.slug}`)}
            </div>
          </section>
        )}
        <section className="space-y-2">
          <h2 className="font-display font-bold text-text">{t.categories}</h2>
          <ul>
            <li className="flex items-center">{item(t.all, null, base, !cat)}</li>
            {tree.map((n) => {
              const expanded = open.has(n.slug);
              return (
                <li key={n.slug}>
                  <div className="flex items-center gap-1">
                    {item(n.label, n.count, `${base}/${n.slug}`, cat === n.slug && !sub)}
                    {n.subs.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggle(n.slug)}
                        aria-expanded={expanded}
                        aria-label={expanded ? t.hideSubs(n.label) : t.showSubs(n.label)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg text-text hover:bg-surface-2"
                      >
                        <span aria-hidden="true">{expanded ? "−" : "+"}</span>
                      </button>
                    )}
                  </div>
                  {expanded && n.subs.length > 0 && (
                    <ul className="mb-1 ml-5 border-l border-line pl-3">
                      {n.subs.map((s) => (
                        <li key={s.slug} className="flex items-center">
                          {item(s.label, s.count, `${base}/${n.slug}/${s.slug}`, cat === n.slug && sub === s.slug, true)}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </aside>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M3 7h10M17 7h4M3 17h4M11 17h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="15" cy="7" r="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="9" cy="17" r="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/** "-15%" si la publicación más barata está claramente por debajo del promedio de 7 días. */
function discount(r: CategoryRow): number | null {
  if (r.oo <= 0 || r.cp <= 0 || !r.a7) return null;
  const pct = (r.cp - r.a7) / r.a7;
  return pct <= -0.05 ? Math.round(pct * 100) : null;
}

function Badge({ pct }: { pct: number }) {
  const { t } = useI18n();
  return (
    <span className="rounded-md bg-down px-1.5 py-0.5 text-xs font-bold text-[#1a0606]" title={t.catalog.below(`${-pct} %`)}>
      {pct}%<span className="sr-only"> ({t.catalog.below(`${-pct} %`)})</span>
    </span>
  );
}

function Price({ r, live = false, className = "" }: { r: CategoryRow; live?: boolean; className?: string }) {
  const { t } = useI18n();
  if (r.oo <= 0) return <span className={`text-muted ${className}`}>{t.common.noOffers}</span>;
  return (
    <span className={className}>
      {live && (
        <span className="mr-1.5 inline-flex align-middle">
          <LiveDot />
        </span>
      )}
      <span className="font-normal text-text-2">{t.common.from} </span>
      <Credits value={r.cp} className="font-semibold text-text" />
    </span>
  );
}

/** La fila con el precio y las ofertas de Habbo en este momento, si ya llegaron. */
function useLiveRow(hotel: string, r: CategoryRow, ref: React.RefObject<Element | null>): { row: CategoryRow; live: boolean } {
  const live = useLivePrice(hotel as HotelCode, r.k, r.t, ref);
  return live && live !== "missing" ? { row: { ...r, cp: live.cp, oo: live.oo }, live: true } : { row: r, live: false };
}

function Card({ r: base, hotel, view, group }: { r: CategoryRow; hotel: string; view: Exclude<CatalogView, "list">; group?: string }) {
  const { t: ui, f, href } = useI18n();
  const ref = useRef<HTMLLIElement>(null);
  const { row: r, live } = useLiveRow(hotel, base, ref);
  const pct = discount(r);
  const compact = view === "small";
  return (
    <li ref={ref} className={`${box} group overflow-hidden`}>
      <Link prefetch={false} href={href(`/${hotel}/furni/${encodeURIComponent(r.k)}`)} className="flex h-full flex-col">
        <span className="relative block aspect-square bg-surface-2" style={TILE_BG}>
          {pct !== null && (
            <span className="absolute left-2 top-2 z-10">
              <Badge pct={pct} />
            </span>
          )}
          <PixelFurni key={view} k={r.k} r={r.r} max={SCALE[view]} className="absolute inset-0" />
        </span>
        <span className={`flex flex-1 flex-col gap-1 ${compact ? "p-2" : "p-3"}`}>
          {!compact && group && <span className="truncate text-xs text-text-2">{group}</span>}
          <span className={`line-clamp-2 text-text group-hover:underline ${compact ? "text-xs" : "text-sm"}`}>{r.n}</span>
          <Price r={r} live={live} className={`mt-auto pt-1 ${compact ? "text-xs" : "text-sm"}`} />
          {!compact && (
            <span className="text-xs text-muted">
              {r.a7 ? (
                <>
                  {ui.catalog.avg7}: <Credits value={r.a7} />
                </>
              ) : r.s30 > 0 ? (
                ui.catList.sold30(f.int(r.s30))
              ) : (
                ui.catList.noMarket
              )}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

function Row({ r: base, hotel, group }: { r: CategoryRow; hotel: string; group?: string }) {
  const { t: ui, f, href } = useI18n();
  const ref = useRef<HTMLLIElement>(null);
  const { row: r, live } = useLiveRow(hotel, base, ref);
  const pct = discount(r);
  return (
    <li ref={ref}>
      <Link prefetch={false} href={href(`/${hotel}/furni/${encodeURIComponent(r.k)}`)} className={`${box} group flex items-center gap-3 p-2.5`}>
        <span className="relative h-16 w-16 shrink-0 rounded-lg bg-surface-2" style={TILE_BG}>
          <PixelFurni k={r.k} r={r.r} max={SCALE.list} className="absolute inset-0" />
        </span>
        <span className="min-w-0 flex-1">
          {group && <span className="block truncate text-xs text-text-2">{group}</span>}
          <span className="block truncate text-sm text-text group-hover:underline">{r.n}</span>
          <Price r={r} live={live} className="block text-sm sm:hidden" />
        </span>
        <Price r={r} live={live} className="hidden w-32 shrink-0 text-right text-sm sm:block" />
        <span className="hidden w-36 shrink-0 text-right text-xs text-muted md:block">
          {r.a7 ? (
            <>
              {ui.catalog.avg7}
              <br />
              <Credits value={r.a7} />
            </>
          ) : (
            "—"
          )}
        </span>
        <span className="hidden w-36 shrink-0 text-right text-xs text-muted lg:block">
          {r.oo > 0 ? ui.common.forSale(f.int(r.oo)) : ui.common.noOffers}
          <br />
          {r.s30 > 0 ? ui.catList.sold30(f.int(r.s30)) : ui.catList.noMarket}
        </span>
        <span className="w-11 shrink-0 text-right">{pct !== null && <Badge pct={pct} />}</span>
      </Link>
    </li>
  );
}

function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  const { t } = useI18n();
  if (pages <= 1) return null;
  // Primera, última y las vecinas de la actual; el resto se resume con "…".
  const nums = [...new Set([1, page - 1, page, page + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const btn = "min-w-9 rounded-lg border border-line px-3 py-1.5 text-sm disabled:opacity-40";
  const out: ReactNode[] = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push(<span key={`gap-${n}`} className="px-1 text-muted">…</span>);
    out.push(
      <button
        key={n}
        type="button"
        onClick={() => onPage(n)}
        aria-current={n === page ? "page" : undefined}
        aria-label={t.catalog.page(n)}
        className={`${btn} ${n === page ? "border-accent bg-accent/15 text-text" : "text-text-2 hover:bg-surface-2"}`}
      >
        {n}
      </button>,
    );
  });
  return (
    <nav aria-label={t.catalog.pagesAria} className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
      <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} className={`${btn} text-text-2 hover:bg-surface-2`}>
        {t.catalog.prev}
      </button>
      {out}
      <button type="button" onClick={() => onPage(page + 1)} disabled={page >= pages} className={`${btn} text-text-2 hover:bg-surface-2`}>
        {t.catalog.next}
      </button>
    </nav>
  );
}

export function Catalog({
  hotel,
  rows,
  groups,
  tree,
  cat,
  sub,
  before,
}: {
  hotel: string;
  rows: CategoryRow[];
  groups: Record<string, string>;
  tree: CatalogNode[];
  cat: string | null;
  sub: string | null;
  /** Avisos que van arriba de la grilla (por ejemplo, "se muestran los 500 más vendidos"). */
  before?: ReactNode;
}) {
  const { t: ui, f } = useI18n();
  const t = ui.catalog;
  const view = useView();
  const [sort, setSort] = useState<Sort>("popular");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const top = useRef<HTMLDivElement>(null);

  const shown = useMemo(() => {
    const q = normalizeText(filter);
    const list = q ? rows.filter((r) => normalizeText(r.n).includes(q)) : [...rows];
    const priced = (r: CategoryRow) => (r.oo > 0 ? r.cp : null);
    if (sort === "cheap") list.sort((a, b) => (priced(a) ?? Infinity) - (priced(b) ?? Infinity));
    if (sort === "expensive") list.sort((a, b) => (priced(b) ?? -1) - (priced(a) ?? -1));
    if (sort === "name") list.sort((a, b) => a.n.localeCompare(b.n));
    return list;
  }, [rows, sort, filter]);

  const size = PAGE[view];
  const pages = Math.max(1, Math.ceil(shown.length / size));
  const current = Math.min(page, pages);
  const slice = shown.slice((current - 1) * size, current * size);
  const goTo = (p: number) => {
    setPage(Math.max(1, Math.min(pages, p)));
    top.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <Sidebar
        hotel={hotel}
        tree={tree}
        cat={cat}
        sub={sub}
        filter={filter}
        onFilter={(v) => {
          setFilter(v);
          setPage(1);
        }}
      />
      <div ref={top} className="min-w-0 scroll-mt-4 space-y-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line pb-3">
          <p className="w-full text-sm text-text-2 sm:w-auto" aria-live="polite">
            {shown.length === 0 ? ui.catList.none : t.results(f.int((current - 1) * size + 1), f.int((current - 1) * size + slice.length), f.int(shown.length))}
          </p>
          <label className="flex items-center gap-2 text-sm text-text-2 sm:ml-auto">
            <span className="sr-only sm:not-sr-only">{t.sortBy}</span>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as Sort);
                setPage(1);
              }}
              className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-text"
            >
              {(["popular", "cheap", "expensive", "name"] as const).map((s) => (
                <option key={s} value={s}>
                  {ui.catList[s]}
                </option>
              ))}
            </select>
          </label>
          <div role="group" aria-label={t.viewAria} className="ml-auto flex items-center gap-0.5 border-line sm:ml-0 sm:border-l sm:pl-3">
            {CATALOG_VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  setCatalogView(v);
                  setPage(1);
                }}
                aria-pressed={view === v}
                title={t.views[v]}
                className={`flex h-9 w-9 items-center justify-center border-b-2 sm:w-10 ${view === v ? "border-text text-text" : "border-transparent text-muted hover:text-text"}`}
              >
                <ViewIcon view={v} />
                <span className="sr-only">{t.views[v]}</span>
              </button>
            ))}
          </div>
        </div>

        {slice.length > 0 && <LiveStatusBar />}

        {before}

        {slice.length === 0 ? (
          <p className={`${box} p-6 text-center text-sm text-muted`}>{ui.catList.none}</p>
        ) : view === "list" ? (
          <ul className="space-y-2">
            {slice.map((r) => (
              <Row key={r.k} r={r} hotel={hotel} group={r.g ? groups[r.g] : undefined} />
            ))}
          </ul>
        ) : (
          <ul className={`grid gap-3 ${GRID[view]}`}>
            {slice.map((r) => (
              <Card key={r.k} r={r} hotel={hotel} view={view} group={r.g ? groups[r.g] : undefined} />
            ))}
          </ul>
        )}

        <Pager page={current} pages={pages} onPage={goTo} />
      </div>
    </div>
  );
}
