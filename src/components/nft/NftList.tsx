import Link from "next/link";
import type { NftRow } from "@/lib/nft/model";
import { nftDiscount, nftWeeklyChange } from "@/lib/nft/rankings";
import { formatInt, formatPct, formatUsd } from "@/lib/format";
import { Delta, Sparkline } from "@/components/ui";
import { NftImage } from "./NftImage";

export type NftMetric = "s7" | "v7" | "change" | "floor" | "discount" | "a30";

const LABEL: Record<NftMetric, string> = {
  s7: "Vendidos 7 d",
  v7: "USD 7 d",
  change: "Variación",
  floor: "Precio piso",
  discount: "Bajo el promedio",
  a30: "Promedio 30 d",
};

function Metric({ row, metric }: { row: NftRow; metric: NftMetric }) {
  switch (metric) {
    case "s7":
      return <span className="tnum">{formatInt(row.s7)}</span>;
    case "v7":
      return <span className="tnum">{formatUsd(row.v7, true)}</span>;
    case "change":
      return <Delta value={nftWeeklyChange(row)} />;
    case "floor":
      return <span className="tnum">{formatUsd(row.floorUsd)}</span>;
    case "discount":
      return <span className="tnum font-medium text-up">−{formatPct(nftDiscount(row), false)}</span>;
    case "a30":
      return <span className="tnum">{formatUsd(row.a30)}</span>;
  }
}

export function NftMiniList({ rows, metric, empty }: { rows: NftRow[]; metric: NftMetric; empty: string }) {
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-muted">{empty}</p>;
  return (
    <ol className="divide-y divide-line/70">
      {rows.map((r, i) => (
        <li key={r.id}>
          <Link href={`/nft/item/${r.id}`} className="flex items-center gap-3 py-2 hover:bg-surface-2/60">
            <span className="tnum w-5 text-right text-xs text-muted">{i + 1}</span>
            <NftImage src={r.img} size={36} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-text">{r.n}</span>
              <span className="block text-xs text-text-2">
                {r.floorUsd !== null ? <>piso {formatUsd(r.floorUsd)}</> : "sin publicaciones"}
                {r.rarity ? ` · ${r.rarity}` : ""}
              </span>
            </span>
            <span className="shrink-0 text-right text-sm">
              <Metric row={r} metric={metric} />
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export function NftTable({ rows, metric }: { rows: NftRow[]; metric: NftMetric }) {
  if (rows.length === 0) {
    return <p className="card p-8 text-center text-sm text-muted">Todavía no hay datos suficientes para esta lista.</p>;
  }
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[680px] text-sm">
        <thead className="text-left text-text-2">
          <tr className="border-b border-line">
            <th className="w-10 px-3 py-2 text-right font-medium">#</th>
            <th className="px-3 py-2 font-medium">NFT</th>
            <th className="px-3 py-2 text-right font-medium">{LABEL[metric]}</th>
            <th className="px-3 py-2 text-right font-medium">Precio piso</th>
            <th className="px-3 py-2 text-right font-medium">Promedio 7 d</th>
            <th className="px-3 py-2 text-right font-medium">Vendidos 7 d</th>
            <th className="hidden px-3 py-2 font-medium md:table-cell">30 días</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className="border-b border-line/60 last:border-0 hover:bg-surface-2/60">
              <td className="tnum px-3 py-2 text-right text-muted">{i + 1}</td>
              <td className="px-3 py-2">
                <Link href={`/nft/item/${r.id}`} className="flex items-center gap-3">
                  <NftImage src={r.img} size={36} />
                  <span className="min-w-0">
                    <span className="block truncate text-text hover:underline">{r.n}</span>
                    <span className="block truncate text-xs text-muted">{[r.rarity, r.type, r.code].filter(Boolean).join(" · ")}</span>
                  </span>
                </Link>
              </td>
              <td className="px-3 py-2 text-right">
                <Metric row={r} metric={metric} />
              </td>
              <td className="tnum px-3 py-2 text-right">{formatUsd(r.floorUsd)}</td>
              <td className="tnum px-3 py-2 text-right text-text-2">{formatUsd(r.a7)}</td>
              <td className="tnum px-3 py-2 text-right text-text-2">{formatInt(r.s7)}</td>
              <td className="hidden px-3 py-2 md:table-cell">
                <Sparkline values={r.sp} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
