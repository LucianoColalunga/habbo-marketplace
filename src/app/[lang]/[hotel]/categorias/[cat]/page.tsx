import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CategoryPage } from "@/components/CategoryPage";
import { PageSkeleton } from "@/components/Skeletons";
import { getCategoryView } from "@/lib/data/views";
import { HOTELS, isEnabledHotel } from "@/lib/hotels";
import { pageMeta } from "@/lib/i18n/seo";
import { getI18n } from "@/lib/i18n/server";
import { categoryBySlug } from "@/lib/market/categories";

export function generateStaticParams() {
  // Una de ejemplo; el resto se genera la primera vez que alguien la visita.
  return [{ cat: "asientos" }];
}

export async function generateMetadata({ params }: PageProps<"/[lang]/[hotel]/categorias/[cat]">): Promise<Metadata> {
  const [{ hotel, cat }, { lang, p, f }] = await Promise.all([params, getI18n()]);
  const def = categoryBySlug(cat);
  if (!isEnabledHotel(hotel) || !def) return { title: p.categories.index, robots: { index: false } };
  const view = await getCategoryView(hotel, cat, null);
  const label = HOTELS[hotel].label;
  return pageMeta({
    lang,
    p,
    path: `/${hotel}/categorias/${cat}`,
    title: p.seo.category(def.label[lang], label),
    description: p.seo.categoryDesc(def.label[lang], label, f.int(view?.total ?? 0)),
  });
}

async function Content({ params }: Pick<PageProps<"/[lang]/[hotel]/categorias/[cat]">, "params">) {
  const { hotel, cat } = await params;
  if (!isEnabledHotel(hotel)) notFound();
  return <CategoryPage hotel={hotel} cat={cat} sub={null} />;
}

export default function CategoriaPage({ params }: PageProps<"/[lang]/[hotel]/categorias/[cat]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}
