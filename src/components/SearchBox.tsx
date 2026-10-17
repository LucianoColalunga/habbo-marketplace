"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { Format } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import type { Ui } from "@/lib/i18n/ui";
import { FurniIcon } from "./FurniIcon";
import { NftImage } from "./nft/NftImage";

interface MarketResult {
  k: string;
  n: string;
  r: number;
  cp: number;
  oo: number;
}

interface NftResult {
  id: string;
  n: string;
  img: string;
  rarity: string;
  floorUsd: number | null;
}

/** Resultado normalizado para mostrar igual furnis del Marketplace y NFT. */
interface Result {
  key: string;
  title: string;
  subtitle: string;
  price: string | null;
  priceSub: string;
  r?: number;
  img?: string;
}

function fromMarket(r: MarketResult, t: Ui, f: Format): Result {
  return {
    key: r.k,
    title: r.n,
    subtitle: r.k,
    price: r.oo > 0 ? `${f.int(r.cp)} ${t.common.creditsShort}` : null,
    priceSub: r.oo > 0 ? t.common.forSale(f.int(r.oo)) : t.common.noOffers,
    r: r.r,
  };
}

function fromNft(r: NftResult, t: Ui, f: Format): Result {
  return {
    key: r.id,
    title: r.n,
    subtitle: r.rarity || "NFT",
    price: r.floorUsd !== null ? f.usd(r.floorUsd) : null,
    priceSub: r.floorUsd !== null ? t.search.floor : t.search.noListings,
    img: r.img,
  };
}

/**
 * Buscador con sugerencias. Sin `nft` busca furnis del Marketplace del hotel;
 * con `nft` busca en la sección NFT (que es independiente).
 */
export function SearchBox({
  hotel = "es",
  nft = false,
  autoFocus = false,
  size = "md",
}: {
  hotel?: string;
  nft?: boolean;
  autoFocus?: boolean;
  size?: "md" | "lg";
}) {
  const router = useRouter();
  const { t, f, href } = useI18n();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      request.current?.abort();
    },
    [],
  );

  /** Busca con una pequeña demora mientras se escribe. */
  const onType = (value: string) => {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    request.current?.abort();
    const q = value.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      const controller = new AbortController();
      request.current = controller;
      try {
        const url = nft
          ? `/api/nft/search?q=${encodeURIComponent(q)}&limit=8`
          : `/api/search?hotel=${hotel}&q=${encodeURIComponent(q)}&limit=8`;
        const res = await fetch(url, { signal: controller.signal });
        const body = (await res.json()) as { results?: (MarketResult | NftResult)[] };
        setResults(
          (body.results ?? []).map((r) => (nft ? fromNft(r as NftResult, t, f) : fromMarket(r as MarketResult, t, f))),
        );
        setActive(-1);
        setOpen(true);
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (key: string) => {
    setOpen(false);
    onType("");
    router.push(href(nft ? `/nft/item/${encodeURIComponent(key)}` : `/${hotel}/furni/${encodeURIComponent(key)}`));
  };

  const big = size === "lg";
  return (
    <div ref={boxRef} className="relative">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (active >= 0 && results[active]) return go(results[active].key);
          const q = query.trim();
          if (q) {
            setOpen(false);
            router.push(href(nft ? `/nft/buscar?q=${encodeURIComponent(q)}` : `/${hotel}/buscar?q=${encodeURIComponent(q)}`));
          }
        }}
      >
        <label className="sr-only" htmlFor={`${listId}-input`}>
          {nft ? t.search.nftLabel : t.search.furniLabel}
        </label>
        <div className="relative">
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted ${big ? "left-4 h-5 w-5" : "left-3 h-4 w-4"}`}
          >
            <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="m13 13 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            id={`${listId}-input`}
            type="search"
            autoComplete="off"
            autoFocus={autoFocus}
            value={query}
            placeholder={nft ? t.search.nftPlaceholder : t.search.furniPlaceholder}
            onChange={(e) => onType(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setOpen(true);
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, -1));
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            role="combobox"
            aria-expanded={open && results.length > 0}
            aria-controls={listId}
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            className={`w-full rounded-xl border border-line bg-surface text-text placeholder:text-muted focus:border-series-1 focus:outline-none ${
              big ? "py-3.5 pl-12 pr-4 text-base" : "py-2 pl-9 pr-3 text-sm"
            }`}
          />
          {loading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted" aria-live="polite">
              {t.search.searching}
            </span>
          )}
        </div>
      </form>
      {open && results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-40 mt-2 max-h-96 overflow-auto rounded-xl border border-line bg-surface-2 p-1 shadow-2xl shadow-black/40"
        >
          {results.map((r, i) => (
            <li
              key={r.key}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                go(r.key);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 ${i === active ? "bg-surface-3" : ""}`}
            >
              {nft ? <NftImage src={r.img ?? ""} size={32} /> : <FurniIcon k={r.key} r={r.r ?? 0} size={32} />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-text">{r.title}</span>
                <span className="block truncate text-xs text-muted">{r.subtitle}</span>
              </span>
              <span className="tnum shrink-0 text-right text-sm">
                {r.price ? <span className="text-text">{r.price}</span> : null}
                <span className="block text-xs text-muted">{r.priceSub}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
