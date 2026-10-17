import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NftRankingView } from "@/components/nft/NftRankingView";
import { PageSkeleton } from "@/components/Skeletons";
import { getI18n } from "@/lib/i18n/server";
import { collectionBySlug, isNftCollectionSlug, NFT_COLLECTIONS } from "@/lib/nft/collections";
import { isNftRankingKind, NFT_RANKINGS } from "@/lib/nft/rankings";

export function generateStaticParams() {
  return NFT_COLLECTIONS.flatMap((c) => Object.keys(NFT_RANKINGS).map((tipo) => ({ slug: c.slug, tipo })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/nft/coleccion/[slug]/[tipo]">): Promise<Metadata> {
  const [{ slug, tipo }, { p }] = await Promise.all([params, getI18n()]);
  if (!isNftCollectionSlug(slug) || !isNftRankingKind(tipo)) return { title: p.nft.rankings.collectionMeta };
  return { title: `${p.nft.collections[slug]}: ${p.nft.rankings.kinds[tipo].title}` };
}

async function Content({ params }: Pick<PageProps<"/[lang]/nft/coleccion/[slug]/[tipo]">, "params">) {
  const { slug, tipo } = await params;
  if (!isNftCollectionSlug(slug) || !isNftRankingKind(tipo)) notFound();
  const { p } = await getI18n();
  const col = collectionBySlug(slug);
  return (
    <NftRankingView kind={tipo} slug={slug} basePath={`/nft/coleccion/${slug}`} title={`${p.nft.collections[slug]} (${col.official})`} />
  );
}

export default function NftCollectionKindPage({ params }: PageProps<"/[lang]/nft/coleccion/[slug]/[tipo]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}
