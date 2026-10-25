import Link from "next/link";
import { TimeAgo } from "@/components/Freshness";
import { NftTable, type NftMetric } from "@/components/nft/NftList";
import { getI18n } from "@/lib/i18n/server";
import type { NftCollectionSlug } from "@/lib/nft/collections";
import { NFT_RANKINGS, type NftRankingKind } from "@/lib/nft/rankings";
import { getNftCollectionStats, getNftMeta, getNftRanking } from "@/lib/nft/views";
import { ExportCsvButton } from "@/components/ExportCsvButton";
import { NftCollectionFlow } from "./NftCollectionFlow";

const METRIC: Record<NftRankingKind, NftMetric> = {
  vendidos: "s7",
  volumen: "v7",
  subas: "change",
  bajas: "change",
  ofertas: "discount",
  caros: "a30",
};

/** Tabla de ranking NFT, de todas las colecciones o de una sola. */
export async function NftRankingView({
  kind,
  slug,
  basePath,
  title,
}: {
  kind: NftRankingKind;
  slug: NftCollectionSlug | null;
  basePath: string;
  title: string;
}) {
  const [rows, meta, stats, { p, href }] = await Promise.all([
    getNftRanking(kind, slug, 100),
    getNftMeta(),
    slug ? getNftCollectionStats(slug) : Promise.resolve(null),
    getI18n(),
  ]);
  const r = p.nft.rankings;
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-3xl font-bold text-text">{title}</h1>
        <p className="mt-1 text-text-2">
          {meta.generatedAt ? (
            <>
              {r.lastScan} <TimeAgo iso={meta.generatedAt} />
              {r.prices}
            </>
          ) : (
            r.noScans
          )}
        </p>
      </header>
      {slug && <NftCollectionFlow stats={stats} />}
      <nav aria-label={r.kindAria} className="flex flex-wrap gap-2">
        {(Object.keys(NFT_RANKINGS) as NftRankingKind[]).map((k) => (
          <Link
            prefetch={false}
            key={k}
            href={href(`${basePath}/${k}`)}
            aria-current={k === kind ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              k === kind ? "border-accent bg-accent/15 text-text" : "border-line text-text-2 hover:bg-surface"
            }`}
          >
            {r.kinds[k].title}
          </Link>
        ))}
      </nav>
      <div>
        <h2 className="font-display text-xl font-bold text-text">{r.kinds[kind].title}</h2>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-text-2">{r.kinds[kind].hint}</p>
          {rows.length > 0 && (
            <ExportCsvButton
              name={`nft-${slug ?? "todas"}-${kind}`}
              rows={[
                ["#", "NFT", "id", p.nft.list.colFloor, p.nft.list.colSold7, "USD 7 d", p.nft.list.colAvg7],
                ...rows.map((row, i) => [i + 1, row.n, row.id, row.floorUsd, row.s7, row.v7, row.a7]),
              ]}
            />
          )}
        </div>
        <NftTable rows={rows} metric={METRIC[kind]} />
      </div>
    </div>
  );
}
