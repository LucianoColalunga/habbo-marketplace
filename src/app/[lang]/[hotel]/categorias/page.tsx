import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CategoryPage } from "@/components/CategoryPage";
import { PageSkeleton } from "@/components/Skeletons";
import { HOTELS, isEnabledHotel } from "@/lib/hotels";
import { pageMeta } from "@/lib/i18n/seo";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata({ params }: PageProps<"/[lang]/[hotel]/categorias">): Promise<Metadata> {
  const [{ hotel }, { lang, p }] = await Promise.all([params, getI18n()]);
  if (!isEnabledHotel(hotel)) return { title: p.categories.index };
  const label = HOTELS[hotel].label;
  return pageMeta({ lang, p, path: `/${hotel}/categorias`, title: p.seo.categories(label), description: p.seo.categoriesDesc(label) });
}

async function Content({ params }: Pick<PageProps<"/[lang]/[hotel]/categorias">, "params">) {
  const { hotel } = await params;
  if (!isEnabledHotel(hotel)) notFound();
  return <CategoryPage hotel={hotel} cat={null} sub={null} />;
}

export default function CategoriasPage({ params }: PageProps<"/[lang]/[hotel]/categorias">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}
