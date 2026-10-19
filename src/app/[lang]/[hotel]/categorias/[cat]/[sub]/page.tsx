import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CategoryPage } from "@/components/CategoryPage";
import { PageSkeleton } from "@/components/Skeletons";
import { getCategoryView } from "@/lib/data/views";
import { HOTELS, isEnabledHotel } from "@/lib/hotels";
import { pageMeta } from "@/lib/i18n/seo";
import { getI18n } from "@/lib/i18n/server";
import { categoryBySlug, subLabel } from "@/lib/market/categories";

const SAFE_SLUG = /^[a-z0-9_-]{1,40}$/;

export function generateStaticParams() {
  // Una de ejemplo; el resto se genera la primera vez que alguien la visita.
  return [{ cat: "asientos", sub: "sofas" }];
}

export async function generateMetadata({ params }: PageProps<"/[lang]/[hotel]/categorias/[cat]/[sub]">): Promise<Metadata> {
  const [{ hotel, cat, sub }, { lang, p, f }] = await Promise.all([params, getI18n()]);
  const def = categoryBySlug(cat);
  const label = def && SAFE_SLUG.test(sub) ? subLabel(def, sub, lang) : null;
  if (!isEnabledHotel(hotel) || !def || !label) return { title: p.categories.index, robots: { index: false } };
  const view = await getCategoryView(hotel, cat, sub);
  if (!view) return { title: p.categories.index, robots: { index: false } };
  const hotelLabel = HOTELS[hotel].label;
  return pageMeta({
    lang,
    p,
    path: `/${hotel}/categorias/${cat}/${sub}`,
    title: p.seo.category(label, hotelLabel),
    description: p.seo.categoryDesc(label, hotelLabel, f.int(view.total)),
  });
}

async function Content({ params }: Pick<PageProps<"/[lang]/[hotel]/categorias/[cat]/[sub]">, "params">) {
  const { hotel, cat, sub } = await params;
  if (!isEnabledHotel(hotel) || !SAFE_SLUG.test(sub)) notFound();
  return <CategoryPage hotel={hotel} cat={cat} sub={sub} />;
}

export default function SubcategoriaPage({ params }: PageProps<"/[lang]/[hotel]/categorias/[cat]/[sub]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}
