import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NftRankingView } from "@/components/nft/NftRankingView";
import { PageSkeleton } from "@/components/Skeletons";
import { getI18n } from "@/lib/i18n/server";
import { isNftRankingKind, NFT_RANKINGS } from "@/lib/nft/rankings";

export function generateStaticParams() {
  return Object.keys(NFT_RANKINGS).map((tipo) => ({ tipo }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/nft/rankings/[tipo]">): Promise<Metadata> {
  const [{ tipo }, { p }] = await Promise.all([params, getI18n()]);
  return { title: isNftRankingKind(tipo) ? p.nft.rankings.kinds[tipo].title : p.nft.rankings.metaTitle };
}

async function Content({ params }: Pick<PageProps<"/[lang]/nft/rankings/[tipo]">, "params">) {
  const { tipo } = await params;
  if (!isNftRankingKind(tipo)) notFound();
  const { p } = await getI18n();
  return <NftRankingView kind={tipo} slug={null} basePath="/nft/rankings" title={p.nft.rankings.title} />;
}

export default function NftRankingKindPage({ params }: PageProps<"/[lang]/nft/rankings/[tipo]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}
