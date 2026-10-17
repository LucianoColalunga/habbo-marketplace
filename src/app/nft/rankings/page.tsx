import type { Metadata } from "next";
import { NftRankingView } from "@/components/nft/NftRankingView";

export const metadata: Metadata = { title: "Rankings" };

export default function NftRankingsPage() {
  return <NftRankingView kind="vendidos" slug={null} basePath="/nft/rankings" title="Rankings NFT" />;
}
