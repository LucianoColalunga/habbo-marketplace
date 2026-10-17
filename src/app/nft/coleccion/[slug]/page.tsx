import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NftRankingView } from "@/components/nft/NftRankingView";
import { PageSkeleton } from "@/components/Skeletons";
import { collectionBySlug, isNftCollectionSlug, NFT_COLLECTIONS } from "@/lib/nft/collections";

export function generateStaticParams() {
  return NFT_COLLECTIONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/nft/coleccion/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: isNftCollectionSlug(slug) ? collectionBySlug(slug).name : "Colección" };
}

async function Content({ params }: Pick<PageProps<"/nft/coleccion/[slug]">, "params">) {
  const { slug } = await params;
  if (!isNftCollectionSlug(slug)) notFound();
  const col = collectionBySlug(slug);
  return <NftRankingView kind="vendidos" slug={slug} basePath={`/nft/coleccion/${slug}`} title={`${col.name} (${col.official})`} />;
}

export default function NftCollectionPage({ params }: PageProps<"/nft/coleccion/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}
