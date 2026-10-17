import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RankingView } from "@/components/RankingView";
import { PageSkeleton } from "@/components/Skeletons";
import { isEnabledHotel } from "@/lib/hotels";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { p } = await getI18n();
  return { title: p.rankings.metaTitle };
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
