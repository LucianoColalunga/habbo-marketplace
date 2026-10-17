import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NftRankingView } from "@/components/nft/NftRankingView";
import { PageSkeleton } from "@/components/Skeletons";
import { getI18n } from "@/lib/i18n/server";
import { collectionBySlug, isNftCollectionSlug, NFT_COLLECTIONS } from "@/lib/nft/collections";

export function generateStaticParams() {
  return NFT_COLLECTIONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/nft/coleccion/[slug]">): Promise<Metadata> {
  const [{ slug }, { p }] = await Promise.all([params, getI18n()]);
  return { title: isNftCollectionSlug(slug) ? p.nft.collections[slug] : p.nft.rankings.collectionMeta };
}

async function Content({ params }: Pick<PageProps<"/[lang]/nft/coleccion/[slug]">, "params">) {
  const { slug } = await params;
  if (!isNftCollectionSlug(slug)) notFound();
  const { p } = await getI18n();
  const col = collectionBySlug(slug);
  return (
    <NftRankingView kind="vendidos" slug={slug} basePath={`/nft/coleccion/${slug}`} title={`${p.nft.collections[slug]} (${col.official})`} />
  );
}

export default function NftCollectionPage({ params }: PageProps<"/[lang]/nft/coleccion/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}
