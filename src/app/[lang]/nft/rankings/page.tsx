import type { Metadata } from "next";
import { NftRankingView } from "@/components/nft/NftRankingView";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { p } = await getI18n();
  return { title: p.nft.rankings.metaTitle };
}

export default async function NftRankingsPage() {
  const { p } = await getI18n();
  return <NftRankingView kind="vendidos" slug={null} basePath="/nft/rankings" title={p.nft.rankings.title} />;
}
