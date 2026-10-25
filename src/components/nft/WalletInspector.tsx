"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ExportCsvButton } from "@/components/ExportCsvButton";
import { Notice, StatTile } from "@/components/ui";
import { useI18n } from "@/lib/i18n/client";
import { IMX_BASE } from "@/lib/nft/api";
import { NFT_COLLECTIONS } from "@/lib/nft/collections";
import { NftImage } from "./NftImage";

/**
 * Inspector de billeteras: qué NFT de Habbo tiene una dirección y cuánto valen
 * al precio piso. Le pregunta a Immutable desde el navegador del visitante
 * (datos públicos de la blockchain); los precios piso salen del último escaneo.
 */

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const PAGE_SIZE = 200;
const MAX_PAGES = 10;
/** Filas que se muestran por vez. */
const STEP = 50;
const COLLECTION_OF = new Map<string, (typeof NFT_COLLECTIONS)[number]["slug"]>(NFT_COLLECTIONS.map((c) => [c.address, c.slug]));

interface Holding {
  id: string;
  name: string;
  img: string;
  slug: (typeof NFT_COLLECTIONS)[number]["slug"];
  count: number;
  floor: number | null;
}

interface Result {
  holdings: Holding[];
  items: number;
  truncated: boolean;
}

interface RawNft {
  contract_address?: string;
  metadata_id?: string | null;
  name?: string | null;
  image?: string | null;
}

async function inspect(address: string, floors: Record<string, number>): Promise<Result> {
  const byId = new Map<string, Holding>();
  let cursor: string | null | undefined = null;
  let items = 0;
  let pages = 0;
  do {
    const url = `${IMX_BASE}/accounts/${address}/nfts?page_size=${PAGE_SIZE}` + (cursor ? `&page_cursor=${encodeURIComponent(cursor)}` : "");
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!res.ok) throw new Error(`Immutable ${res.status}`);
    const body = (await res.json()) as { result?: RawNft[]; page?: { next_cursor?: string | null } };
    for (const nft of body.result ?? []) {
      const slug = COLLECTION_OF.get((nft.contract_address ?? "").toLowerCase());
      const id = nft.metadata_id;
      if (!slug || !id) continue;
      items++;
      const h = byId.get(id);
      if (h) h.count++;
      else byId.set(id, { id, name: nft.name ?? id, img: nft.image ?? "", slug, count: 1, floor: floors[id] ?? null });
    }
    cursor = body.page?.next_cursor;
    pages++;
  } while (cursor && pages < MAX_PAGES);
  const holdings = [...byId.values()].sort((a, b) => (b.floor ?? 0) * b.count - (a.floor ?? 0) * a.count || b.count - a.count);
  return { holdings, items, truncated: Boolean(cursor) };
}

export function WalletInspector() {
  const { t: ui, f, href } = useI18n();
  const t = ui.wallet;
  const [address, setAddress] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error" | "invalid">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [visible, setVisible] = useState(STEP);

  const run = async (raw: string) => {
    const a = raw.trim();
    if (!ADDRESS.test(a)) return setState("invalid");
    setState("loading");
    setResult(null);
    setVisible(STEP);
    try {
      const floors = ((await (await fetch("/api/nft/floors")).json()) as { floors?: Record<string, number> }).floors ?? {};
      setResult(await inspect(a.toLowerCase(), floors));
      setState("done");
      // La dirección queda en la URL para poder compartirla.
      window.history.replaceState(window.history.state, "", `${window.location.pathname}?w=${a}`);
    } catch {
      setState("error");
    }
  };

  // Si la página se abrió con ?w=0x…, se inspecciona sola.
  useEffect(() => {
    const w = new URLSearchParams(window.location.search).get("w");
    if (!w || !ADDRESS.test(w)) return;
    void Promise.resolve().then(() => {
      setAddress(w);
      return run(w);
    });
    // Solo al abrir la página.
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(address);
  };
  const total = result?.holdings.reduce((s, h) => s + (h.floor ?? 0) * h.count, 0) ?? 0;

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="card flex flex-wrap items-end gap-2 p-4">
        <label className="min-w-0 flex-1 basis-72 space-y-1">
          <span className="block text-sm text-text-2">{t.label}</span>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t.placeholder}
            spellCheck={false}
            autoComplete="off"
            maxLength={42}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-sm text-text"
          />
        </label>
        <button type="submit" disabled={state === "loading"} className="rounded-lg bg-accent px-4 py-2 font-medium text-accent-ink disabled:opacity-60">
          {state === "loading" ? t.loading : t.submit}
        </button>
      </form>

      {state === "invalid" && <Notice tone="warn">{t.invalid}</Notice>}
      {state === "error" && <Notice tone="warn">{t.error}</Notice>}
      {state === "loading" && <div className="skeleton h-40" aria-busy="true" />}
      {state === "done" && result && result.items === 0 && <Notice>{t.empty}</Notice>}

      {state === "done" && result && result.items > 0 && (
        <section className="space-y-3" aria-label={t.title}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatTile label={t.items} value={<span className="tnum">{f.int(result.items)}</span>} />
            <StatTile label={t.models} value={<span className="tnum">{f.int(result.holdings.length)}</span>} />
            <StatTile label={t.value} value={<span className="tnum">{f.usd(total)}</span>} help={t.valueHint} />
          </div>
          <p className="text-xs text-muted">
            {t.valueHint}
            {result.truncated ? ` ${t.truncated(f.int(result.items))}` : ""}
          </p>
          <div className="flex justify-end">
            <ExportCsvButton
              name="billetera"
              rows={() => [
                [t.colItem, "id", t.colCollection, t.colCount, t.colFloor, t.colTotal],
                ...result.holdings.map((h) => [h.name, h.id, h.slug, h.count, h.floor, h.floor === null ? null : Math.round(h.floor * h.count * 100) / 100]),
              ]}
            />
          </div>
          <div className="card relative overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="text-left text-text-2">
                <tr className="border-b border-line">
                  <th className="px-3 py-2 font-medium">{t.colItem}</th>
                  <th className="px-3 py-2 font-medium">{t.colCollection}</th>
                  <th className="px-3 py-2 text-right font-medium">{t.colCount}</th>
                  <th className="px-3 py-2 text-right font-medium">{t.colFloor}</th>
                  <th className="px-3 py-2 text-right font-medium">{t.colTotal}</th>
                </tr>
              </thead>
              <tbody className="tnum">
                {result.holdings.slice(0, visible).map((h) => (
                  <tr key={h.id} className="border-b border-line/60 last:border-0">
                    <td className="px-3 py-2">
                      <Link prefetch={false} href={href(`/nft/item/${h.id}`)} className="flex items-center gap-3">
                        <NftImage src={h.img} size={36} />
                        <span className="truncate text-text hover:underline">{h.name}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-text-2">{ui.nftNav[h.slug]}</td>
                    <td className="px-3 py-2 text-right text-text">{f.int(h.count)}</td>
                    <td className="px-3 py-2 text-right text-text-2">{h.floor === null ? t.noFloor : f.usd(h.floor)}</td>
                    <td className="px-3 py-2 text-right text-text">{h.floor === null ? "—" : f.usd(h.floor * h.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.holdings.length > visible && (
            <button
              type="button"
              onClick={() => setVisible((v) => v + STEP)}
              className="rounded-lg border border-line px-4 py-2 text-sm text-text hover:bg-surface-2"
            >
              {t.more(f.int(Math.min(STEP, result.holdings.length - visible)), f.int(result.holdings.length - visible))}
            </button>
          )}
        </section>
      )}
    </div>
  );
}
