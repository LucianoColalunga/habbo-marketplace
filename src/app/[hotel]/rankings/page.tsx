import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RankingView } from "@/components/RankingView";
import { isEnabledHotel } from "@/lib/hotels";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/Skeletons";

export const metadata: Metadata = { title: "Rankings" };

async function RankingsPageContent({ params }: Pick<PageProps<"/[hotel]/rankings">, "params">) {
  const { hotel } = await params;
  if (!isEnabledHotel(hotel)) notFound();
  return <RankingView hotel={hotel} kind="vendidos" />;
}

export default function RankingsPage({ params }: PageProps<"/[hotel]/rankings">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RankingsPageContent params={params} />
    </Suspense>
  );
}
