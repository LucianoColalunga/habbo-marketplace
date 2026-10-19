import type { Metadata } from "next";
import { NftRankingView } from "@/components/nft/NftRankingView";
import { pageMeta } from "@/lib/i18n/seo";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { lang, p } = await getI18n();
  return pageMeta({
    lang,
    p,
    section: "nft",
    path: "/nft/rankings",
    title: p.nft.rankings.title,
    description: p.seo.nftRankingDesc(p.nft.rankings.kinds.vendidos.hint),
  });
}

export default async function NftRankingsPage() {
  const { p } = await getI18n();
  return <NftRankingView kind="vendidos" slug={null} basePath="/nft/rankings" title={p.nft.rankings.title} />;
}
