import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NftRankingView } from "@/components/nft/NftRankingView";
import { PageSkeleton } from "@/components/Skeletons";
import { collectionBySlug, isNftCollectionSlug, NFT_COLLECTIONS } from "@/lib/nft/collections";
import { isNftRankingKind, NFT_RANKINGS } from "@/lib/nft/rankings";

export function generateStaticParams() {
  return NFT_COLLECTIONS.flatMap((c) => Object.keys(NFT_RANKINGS).map((tipo) => ({ slug: c.slug, tipo })));
}

export async function generateMetadata({ params }: PageProps<"/nft/coleccion/[slug]/[tipo]">): Promise<Metadata> {
  const { slug, tipo } = await params;
  if (!isNftCollectionSlug(slug) || !isNftRankingKind(tipo)) return { title: "Colección" };
  return { title: `${collectionBySlug(slug).name}: ${NFT_RANKINGS[tipo].title}` };
}

async function Content({ params }: Pick<PageProps<"/nft/coleccion/[slug]/[tipo]">, "params">) {
  const { slug, tipo } = await params;
  if (!isNftCollectionSlug(slug) || !isNftRankingKind(tipo)) notFound();
  const col = collectionBySlug(slug);
  return <NftRankingView kind={tipo} slug={slug} basePath={`/nft/coleccion/${slug}`} title={`${col.name} (${col.official})`} />;
}

export default function NftCollectionKindPage({ params }: PageProps<"/nft/coleccion/[slug]/[tipo]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}
