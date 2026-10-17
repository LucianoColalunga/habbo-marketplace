"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { FurniIcon } from "./FurniIcon";

interface Result {
  k: string;
  n: string;
  r: number;
  cp: number;
  oo: number;
}

export function SearchBox({ hotel, autoFocus = false, size = "md" }: { hotel: string; autoFocus?: boolean; size?: "md" | "lg" }) {
  const router = useRouter();
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
        const res = await fetch(`/api/search?hotel=${hotel}&q=${encodeURIComponent(q)}&limit=8`, { signal: controller.signal });
        const body = (await res.json()) as { results?: Result[] };
        setResults(body.results ?? []);
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

  const go = (k: string) => {
    setOpen(false);
    onType("");
    router.push(`/${hotel}/furni/${encodeURIComponent(k)}`);
  };

  const big = size === "lg";
  return (
    <div ref={boxRef} className="relative">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (active >= 0 && results[active]) return go(results[active].k);
          const q = query.trim();
          if (q) {
            setOpen(false);
            router.push(`/${hotel}/buscar?q=${encodeURIComponent(q)}`);
          }
        }}
      >
        <label className="sr-only" htmlFor={`${listId}-input`}>
          Buscar furni
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
            placeholder="Buscá un furni: trono, dragón, sofá…"
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
              buscando…
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
              key={r.k}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                go(r.k);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 ${i === active ? "bg-surface-3" : ""}`}
            >
              <FurniIcon k={r.k} r={r.r} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-text">{r.n}</span>
                <span className="block truncate text-xs text-muted">{r.k}</span>
              </span>
              <span className="tnum shrink-0 text-right text-sm">
                {r.oo > 0 ? (
                  <>
                    <span className="text-text">{r.cp.toLocaleString("es-AR")} c</span>
                    <span className="block text-xs text-muted">{r.oo} en venta</span>
                  </>
                ) : (
                  <span className="text-xs text-muted">sin ofertas</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
