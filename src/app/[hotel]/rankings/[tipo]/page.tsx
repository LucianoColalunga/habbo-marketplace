import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RankingView } from "@/components/RankingView";
import { isRankingKind, RANKINGS } from "@/lib/data/rankings";
import { isEnabledHotel } from "@/lib/hotels";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/Skeletons";

export function generateStaticParams() {
  return Object.keys(RANKINGS).map((tipo) => ({ tipo }));
}

export async function generateMetadata({ params }: PageProps<"/[hotel]/rankings/[tipo]">): Promise<Metadata> {
  const { tipo } = await params;
  return { title: isRankingKind(tipo) ? RANKINGS[tipo].title : "Rankings" };
}

async function RankingKindPageContent({ params }: Pick<PageProps<"/[hotel]/rankings/[tipo]">, "params">) {
  const { hotel, tipo } = await params;
  if (!isEnabledHotel(hotel) || !isRankingKind(tipo)) notFound();
  return <RankingView hotel={hotel} kind={tipo} />;
}

export default function RankingKindPage({ params }: PageProps<"/[hotel]/rankings/[tipo]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RankingKindPageContent params={params} />
    </Suspense>
  );
}
