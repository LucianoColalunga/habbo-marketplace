import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORY_LIMIT, getCategoryView } from "@/lib/data/views";
import { HOTELS, type HotelCode } from "@/lib/hotels";
import { getI18n } from "@/lib/i18n/server";
import { categoryBySlug, subLabel } from "@/lib/market/categories";
import { CategoryList } from "./CategoryList";
import { Notice } from "./ui";

/** Página de una categoría o subcategoría: chips de subcategorías y la lista de furnis. */
export async function CategoryPage({ hotel, cat, sub }: { hotel: HotelCode; cat: string; sub: string | null }) {
  const def = categoryBySlug(cat);
  if (!def) notFound();
  const [view, { lang, p, f, href }] = await Promise.all([getCategoryView(hotel, cat, sub), getI18n()]);
  if (!view) notFound();
  const c = p.categories;
  const catLabel = def.label[lang];
  const label = sub ? (subLabel(def, sub, lang) ?? sub) : catLabel;
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm ${active ? "border-accent bg-accent/15 text-text" : "border-line text-text-2 hover:bg-surface"}`;

  return (
    <div className="space-y-5">
      <nav className="text-sm text-text-2" aria-label={c.breadcrumb}>
        <Link prefetch={false} href={href(`/${hotel}/categorias`)} className="hover:text-text">
          {c.index}
        </Link>
        {sub && (
          <>
            {" / "}
            <Link prefetch={false} href={href(`/${hotel}/categorias/${cat}`)} className="hover:text-text">
              {catLabel}
            </Link>
          </>
        )}
        {" / "}
        <span className="text-text">{label}</span>
      </nav>
      <header>
        <h1 className="font-display text-3xl font-bold text-text">{label}</h1>
        <p className="mt-1 text-text-2">
          {c.count(f.int(view.total))} · Habbo {HOTELS[hotel].label}
          {cat === "colecciones" && !sub ? ` · ${c.collectionsHint}` : ""}
        </p>
      </header>

      {view.subs.length > 0 && (
        <nav aria-label={c.subsAria} className="flex flex-wrap gap-2">
          <Link prefetch={false} href={href(`/${hotel}/categorias/${cat}`)} aria-current={!sub ? "page" : undefined} className={chip(!sub)}>
            {c.all}
          </Link>
          {view.subs.map((s) => (
            <Link
              key={s.slug}
              prefetch={false}
              href={href(`/${hotel}/categorias/${cat}/${s.slug}`)}
              aria-current={sub === s.slug ? "page" : undefined}
              className={chip(sub === s.slug)}
            >
              {subLabel(def, s.slug, lang) ?? s.slug} <span className="tnum text-muted">{f.int(s.count)}</span>
            </Link>
          ))}
        </nav>
      )}

      {view.total === 0 ? (
        <Notice>{c.empty}</Notice>
      ) : (
        <>
          {view.total > CATEGORY_LIMIT && <Notice>{c.limited(f.int(view.rows.length), f.int(view.total))}</Notice>}
          <CategoryList hotel={hotel} rows={view.rows} />
        </>
      )}
    </div>
  );
}
