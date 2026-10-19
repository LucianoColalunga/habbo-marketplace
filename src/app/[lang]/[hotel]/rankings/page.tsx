import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RankingView } from "@/components/RankingView";
import { PageSkeleton } from "@/components/Skeletons";
import { HOTELS, isEnabledHotel } from "@/lib/hotels";
import { pageMeta } from "@/lib/i18n/seo";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata({ params }: PageProps<"/[lang]/[hotel]/rankings">): Promise<Metadata> {
  const [{ hotel }, { lang, p }] = await Promise.all([params, getI18n()]);
  if (!isEnabledHotel(hotel)) return { title: p.rankings.metaTitle };
  const label = HOTELS[hotel].label;
  const kind = p.rankings.kinds.vendidos;
  return pageMeta({
    lang,
    p,
    path: `/${hotel}/rankings`,
    title: p.seo.rankings(kind.title, label),
    description: p.seo.rankingsDesc(kind.hint, label),
  });
}

async function RankingsPageContent({ params }: Pick<PageProps<"/[lang]/[hotel]/rankings">, "params">) {
  const { hotel } = await params;
  if (!isEnabledHotel(hotel)) notFound();
  return <RankingView hotel={hotel} kind="vendidos" />;
}

export default function RankingsPage({ params }: PageProps<"/[lang]/[hotel]/rankings">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RankingsPageContent params={params} />
    </Suspense>
  );
}
