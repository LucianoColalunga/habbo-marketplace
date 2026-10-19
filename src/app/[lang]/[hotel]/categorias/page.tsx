import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FurniIcon } from "@/components/FurniIcon";
import { PageSkeleton } from "@/components/Skeletons";
import { Notice } from "@/components/ui";
import { getCategoryOverview } from "@/lib/data/views";
import { HOTELS, isEnabledHotel } from "@/lib/hotels";
import { pageMeta } from "@/lib/i18n/seo";
import { getI18n } from "@/lib/i18n/server";
import { categoryBySlug, subLabel } from "@/lib/market/categories";

export async function generateMetadata({ params }: PageProps<"/[lang]/[hotel]/categorias">): Promise<Metadata> {
  const [{ hotel }, { lang, p }] = await Promise.all([params, getI18n()]);
  if (!isEnabledHotel(hotel)) return { title: p.categories.index };
  const label = HOTELS[hotel].label;
  return pageMeta({ lang, p, path: `/${hotel}/categorias`, title: p.seo.categories(label), description: p.seo.categoriesDesc(label) });
}

async function Content({ params }: Pick<PageProps<"/[lang]/[hotel]/categorias">, "params">) {
  const { hotel } = await params;
  if (!isEnabledHotel(hotel)) notFound();
  const [cards, { lang, p, f, href }] = await Promise.all([getCategoryOverview(hotel), getI18n()]);
  const c = p.categories;
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-text">{c.title(HOTELS[hotel].label)}</h1>
        <p className="mt-2 max-w-3xl text-text-2">{c.intro}</p>
      </header>
      {cards.length === 0 ? (
        <Notice tone="warn">{c.pending}</Notice>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const def = categoryBySlug(card.slug)!;
            return (
              <li key={card.slug} className="card flex flex-col gap-3 p-4">
                <Link prefetch={false} href={href(`/${hotel}/categorias/${card.slug}`)} className="group flex items-center gap-3">
                  <span className="flex -space-x-3">
                    {card.icons.map((i) => (
                      <FurniIcon key={i.k} k={i.k} r={i.r} size={40} />
                    ))}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-lg font-bold text-text group-hover:underline">{def.label[lang]}</span>
                    <span className="block text-sm text-text-2">{c.count(f.int(card.count))}</span>
                  </span>
                </Link>
                {card.subs.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5 text-xs">
                    {card.subs.slice(0, 8).map((s) => (
                      <li key={s.slug}>
                        <Link
                          prefetch={false}
                          href={href(`/${hotel}/categorias/${card.slug}/${s.slug}`)}
                          className="inline-block rounded-full border border-line px-2.5 py-1 text-text-2 hover:bg-surface-2 hover:text-text"
                        >
                          {subLabel(def, s.slug, lang) ?? s.slug}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function CategoriasPage({ params }: PageProps<"/[lang]/[hotel]/categorias">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}
