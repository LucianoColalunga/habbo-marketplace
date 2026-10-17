import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NftRankingView } from "@/components/nft/NftRankingView";
import { PageSkeleton } from "@/components/Skeletons";
import { isNftRankingKind, NFT_RANKINGS } from "@/lib/nft/rankings";

export function generateStaticParams() {
  return Object.keys(NFT_RANKINGS).map((tipo) => ({ tipo }));
}

export async function generateMetadata({ params }: PageProps<"/nft/rankings/[tipo]">): Promise<Metadata> {
  const { tipo } = await params;
  return { title: isNftRankingKind(tipo) ? NFT_RANKINGS[tipo].title : "Rankings" };
}

async function Content({ params }: Pick<PageProps<"/nft/rankings/[tipo]">, "params">) {
  const { tipo } = await params;
  if (!isNftRankingKind(tipo)) notFound();
  return <NftRankingView kind={tipo} slug={null} basePath="/nft/rankings" title="Rankings NFT" />;
}

export default function NftRankingKindPage({ params }: PageProps<"/nft/rankings/[tipo]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}
