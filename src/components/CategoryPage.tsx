import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORY_LIMIT, getCatalogAll, getCategoryFlow, getCategoryOverview, getCategoryView, getMarketFlow } from "@/lib/data/views";
import { HOTELS, type HotelCode } from "@/lib/hotels";
import { getI18n } from "@/lib/i18n/server";
import { categoryBySlug, subLabel } from "@/lib/market/categories";
import { Catalog, type CatalogNode } from "./catalog/Catalog";
import { MarketFlowCard } from "./MarketFlowCard";
import { Notice } from "./ui";

/**
 * Catálogo: todos los furnis (sin `cat`), una categoría o una subcategoría.
 * El menú de la izquierda tiene todas las categorías con sus subcategorías.
 */
export async function CategoryPage({ hotel, cat, sub }: { hotel: HotelCode; cat: string | null; sub: string | null }) {
  const def = cat ? categoryBySlug(cat) : null;
  if (cat && !def) notFound();
  const [view, overview, flow, { lang, p, f, href, t }] = await Promise.all([
    cat ? getCategoryView(hotel, cat, sub) : getCatalogAll(hotel),
    getCategoryOverview(hotel),
    cat ? getCategoryFlow(hotel, cat, sub) : getMarketFlow(hotel),
    getI18n(),
  ]);
  if (!view) notFound();
  const c = p.categories;

  const tree: CatalogNode[] = overview.map((card) => {
    const d = categoryBySlug(card.slug)!;
    return {
      slug: card.slug,
      label: d.label[lang],
      count: card.count,
      subs: card.subs.map((s) => ({ slug: s.slug, label: subLabel(d, s.slug, lang) ?? s.slug, count: s.count })),
    };
  });
  const node = tree.find((n) => n.slug === cat);
  // Lo que se ve arriba de cada nombre: la subcategoría o, en "Todos", la categoría.
  const groups = Object.fromEntries(node ? node.subs.map((s) => [s.slug, s.label]) : tree.map((n) => [n.slug, n.label]));
  const catLabel = def?.label[lang] ?? "";
  const label = !def ? c.title(HOTELS[hotel].label) : sub ? (subLabel(def, sub, lang) ?? sub) : catLabel;

  return (
    <div className="space-y-5">
      <nav className="text-sm text-text-2" aria-label={c.breadcrumb}>
        <Link prefetch={false} href={href(`/${hotel}`)} className="hover:text-text">
          {t.nav.home}
        </Link>
        {" » "}
        {def ? (
          <Link prefetch={false} href={href(`/${hotel}/categorias`)} className="hover:text-text">
            {c.index}
          </Link>
        ) : (
          <span className="text-text">{c.index}</span>
        )}
        {def && sub && (
          <>
            {" » "}
            <Link prefetch={false} href={href(`/${hotel}/categorias/${cat}`)} className="hover:text-text">
              {catLabel}
            </Link>
          </>
        )}
        {def && (
          <>
            {" » "}
            <span className="text-text">{label}</span>
          </>
        )}
      </nav>
      <header>
        <h1 className="font-display text-3xl font-bold text-text">{label}</h1>
        <p className="mt-1 max-w-3xl text-text-2">
          {def ? (
            <>
              {c.count(f.int(view.total))} · Habbo {HOTELS[hotel].label}
              {cat === "colecciones" && !sub ? ` · ${c.collectionsHint}` : ""}
            </>
          ) : (
            c.intro
          )}
        </p>
      </header>

      {tree.length > 0 && <MarketFlowCard flow={flow} title={cat ? t.marketFlow.catTitle : t.marketFlow.homeTitle} />}

      {tree.length === 0 ? (
        <Notice tone="warn">{c.pending}</Notice>
      ) : (
        <Catalog
          hotel={hotel}
          rows={view.rows}
          groups={groups}
          tree={tree}
          cat={cat}
          sub={sub}
          before={
            view.total === 0 ? (
              <Notice>{c.empty}</Notice>
            ) : view.total > CATEGORY_LIMIT ? (
              <Notice>{c.limited(f.int(view.rows.length), f.int(view.total))}</Notice>
            ) : null
          }
        />
      )}
    </div>
  );
}
