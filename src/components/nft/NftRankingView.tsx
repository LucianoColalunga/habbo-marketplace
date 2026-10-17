import Link from "next/link";
import { TimeAgo } from "@/components/Freshness";
import { NftTable, type NftMetric } from "@/components/nft/NftList";
import { NFT_RANKINGS, type NftRankingKind } from "@/lib/nft/rankings";
import { getNftMeta, getNftRanking } from "@/lib/nft/views";
import type { NftCollectionSlug } from "@/lib/nft/collections";

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
  const [rows, meta] = await Promise.all([getNftRanking(kind, slug, 100), getNftMeta()]);
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-3xl font-bold text-text">{title}</h1>
        <p className="mt-1 text-text-2">
          {meta.generatedAt ? (
            <>
              Último escaneo <TimeAgo iso={meta.generatedAt} />. Precios en dólares (aproximados).
            </>
          ) : (
            "Todavía no hay escaneos guardados."
          )}
        </p>
      </header>
      <nav aria-label="Tipo de ranking" className="flex flex-wrap gap-2">
        {(Object.keys(NFT_RANKINGS) as NftRankingKind[]).map((k) => (
          <Link
            key={k}
            href={`${basePath}/${k}`}
            aria-current={k === kind ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              k === kind ? "border-accent bg-accent/15 text-text" : "border-line text-text-2 hover:bg-surface"
            }`}
          >
            {NFT_RANKINGS[k].title}
          </Link>
        ))}
      </nav>
      <div>
        <h2 className="font-display text-xl font-bold text-text">{NFT_RANKINGS[kind].title}</h2>
        <p className="mb-3 text-sm text-text-2">{NFT_RANKINGS[kind].hint}</p>
        <NftTable rows={rows} metric={METRIC[kind]} />
      </div>
    </div>
  );
}
