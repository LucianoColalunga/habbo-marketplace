import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RankingView } from "@/components/RankingView";
import { PageSkeleton } from "@/components/Skeletons";
import { isRankingKind, RANKINGS } from "@/lib/data/rankings";
import { HOTELS, isEnabledHotel } from "@/lib/hotels";
import { pageMeta } from "@/lib/i18n/seo";
import { getI18n } from "@/lib/i18n/server";

export function generateStaticParams() {
  return Object.keys(RANKINGS).map((tipo) => ({ tipo }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/[hotel]/rankings/[tipo]">): Promise<Metadata> {
  const [{ hotel, tipo }, { lang, p }] = await Promise.all([params, getI18n()]);
  if (!isEnabledHotel(hotel) || !isRankingKind(tipo)) return { title: p.rankings.metaTitle };
  const label = HOTELS[hotel].label;
  const kind = p.rankings.kinds[tipo];
  return pageMeta({
    lang,
    p,
    // "Más vendidos" es la misma lista que /rankings: esa es la dirección principal.
    path: tipo === "vendidos" ? `/${hotel}/rankings` : `/${hotel}/rankings/${tipo}`,
    title: p.seo.rankings(kind.title, label),
    description: p.seo.rankingsDesc(kind.hint, label),
  });
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
