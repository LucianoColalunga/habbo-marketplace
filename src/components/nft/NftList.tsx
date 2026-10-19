import Link from "next/link";
import type { Format } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import type { NftRow } from "@/lib/nft/model";
import { nftDiscount, nftWeeklyChange } from "@/lib/nft/rankings";
import { Delta, Sparkline } from "@/components/ui";
import { NftImage } from "./NftImage";

export type NftMetric = "s7" | "v7" | "change" | "floor" | "discount" | "a30";

function Metric({ row, metric, f }: { row: NftRow; metric: NftMetric; f: Format }) {
  switch (metric) {
    case "s7":
      return <span className="tnum">{f.int(row.s7)}</span>;
    case "v7":
      return <span className="tnum">{f.usd(row.v7, true)}</span>;
    case "change":
      return <Delta value={nftWeeklyChange(row)} />;
    case "floor":
      return <span className="tnum">{f.usd(row.floorUsd)}</span>;
    case "discount":
      return <span className="tnum font-medium text-up">−{f.pct(nftDiscount(row), false)}</span>;
    case "a30":
      return <span className="tnum">{f.usd(row.a30)}</span>;
  }
}

export async function NftMiniList({ rows, metric, empty }: { rows: NftRow[]; metric: NftMetric; empty: string }) {
  const { p, f, href } = await getI18n();
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-muted">{empty}</p>;
  return (
    <ol className="divide-y divide-line/70">
      {rows.map((r, i) => (
        <li key={r.id}>
          <Link prefetch={false} href={href(`/nft/item/${r.id}`)} className="flex items-center gap-3 py-2 hover:bg-surface-2/60">
            <span className="tnum w-5 text-right text-xs text-muted">{i + 1}</span>
            <NftImage src={r.img} size={36} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-text">{r.n}</span>
              <span className="block text-xs text-text-2">
                {r.floorUsd !== null ? p.nft.list.floor(f.usd(r.floorUsd)) : p.nft.list.noListings}
                {r.rarity ? ` · ${r.rarity}` : ""}
              </span>
            </span>
            <span className="shrink-0 text-right text-sm">
              <Metric row={r} metric={metric} f={f} />
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export async function NftTable({ rows, metric }: { rows: NftRow[]; metric: NftMetric }) {
  const { p, f, href } = await getI18n();
  const l = p.nft.list;
  if (rows.length === 0) {
    return <p className="card p-8 text-center text-sm text-muted">{l.empty}</p>;
  }
  return (
    <div className="card overflow-x-auto relative">
      <table className="w-full min-w-[680px] text-sm">
        <thead className="text-left text-text-2">
          <tr className="border-b border-line">
            <th className="w-10 px-3 py-2 text-right font-medium">#</th>
            <th className="px-3 py-2 font-medium">NFT</th>
            <th className="px-3 py-2 text-right font-medium">{l.metric[metric]}</th>
            <th className="px-3 py-2 text-right font-medium">{l.colFloor}</th>
            <th className="px-3 py-2 text-right font-medium">{l.colAvg7}</th>
            <th className="px-3 py-2 text-right font-medium">{l.colSold7}</th>
            <th className="hidden px-3 py-2 font-medium md:table-cell">{l.col30}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className="border-b border-line/60 last:border-0 hover:bg-surface-2/60">
              <td className="tnum px-3 py-2 text-right text-muted">{i + 1}</td>
              <td className="px-3 py-2">
                <Link prefetch={false} href={href(`/nft/item/${r.id}`)} className="flex items-center gap-3">
                  <NftImage src={r.img} size={36} />
                  <span className="min-w-0">
                    <span className="block truncate text-text hover:underline">{r.n}</span>
                    <span className="block truncate text-xs text-muted">{[r.rarity, r.type, r.code].filter(Boolean).join(" · ")}</span>
                  </span>
                </Link>
              </td>
              <td className="px-3 py-2 text-right">
                <Metric row={r} metric={metric} f={f} />
              </td>
              <td className="tnum px-3 py-2 text-right">{f.usd(r.floorUsd)}</td>
              <td className="tnum px-3 py-2 text-right text-text-2">{f.usd(r.a7)}</td>
              <td className="tnum px-3 py-2 text-right text-text-2">{f.int(r.s7)}</td>
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
