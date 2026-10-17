import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RankingView } from "@/components/RankingView";
import { PageSkeleton } from "@/components/Skeletons";
import { isRankingKind, RANKINGS } from "@/lib/data/rankings";
import { isEnabledHotel } from "@/lib/hotels";
import { getI18n } from "@/lib/i18n/server";

export function generateStaticParams() {
  return Object.keys(RANKINGS).map((tipo) => ({ tipo }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/[hotel]/rankings/[tipo]">): Promise<Metadata> {
  const [{ tipo }, { p }] = await Promise.all([params, getI18n()]);
  return { title: isRankingKind(tipo) ? p.rankings.kinds[tipo].title : p.rankings.metaTitle };
}

async function RankingKindPageContent({ params }: Pick<PageProps<"/[lang]/[hotel]/rankings/[tipo]">, "params">) {
  const { hotel, tipo } = await params;
  if (!isEnabledHotel(hotel) || !isRankingKind(tipo)) notFound();
  return <RankingView hotel={hotel} kind={tipo} />;
}

export default function RankingKindPage({ params }: PageProps<"/[lang]/[hotel]/rankings/[tipo]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RankingKindPageContent params={params} />
    </Suspense>
  );
}
