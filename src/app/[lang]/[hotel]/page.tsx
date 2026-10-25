import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TimeAgo } from "@/components/Freshness";
import { FurniMiniList } from "@/components/FurniList";
import { JoinChannels } from "@/components/JoinChannels";
import { SearchBox } from "@/components/SearchBox";
import { PageSkeleton } from "@/components/Skeletons";
import { CoinGlyph, Notice, SectionTitle, StatTile } from "@/components/ui";
import { getCategoryOverview, getHomeView, getMarketFlow } from "@/lib/data/views";
import { MarketFlowCard } from "@/components/MarketFlowCard";
import { HOTELS, isEnabledHotel } from "@/lib/hotels";
import { pageMeta } from "@/lib/i18n/seo";
import { getI18n } from "@/lib/i18n/server";
import { categoryBySlug } from "@/lib/market/categories";

export async function generateMetadata({ params }: PageProps<"/[lang]/[hotel]">): Promise<Metadata> {
  const [{ hotel }, { lang, p, t }] = await Promise.all([params, getI18n()]);
  if (!isEnabledHotel(hotel)) return {};
  const label = HOTELS[hotel].label;
  return pageMeta({ lang, p, path: `/${hotel}`, title: p.seo.home(label), description: p.seo.homeDesc(label, t.hotel.regions[hotel]) });
}

async function HotelHomeContent({ params }: Pick<PageProps<"/[lang]/[hotel]">, "params">) {
  const { hotel } = await params;
  if (!isEnabledHotel(hotel)) notFound();
  const [view, cards, flow, { lang, p, t, f, href }] = await Promise.all([
    getHomeView(hotel),
    getCategoryOverview(hotel),
    getMarketFlow(hotel),
    getI18n(),
  ]);
  const h = p.home;

  return (
    <div className="space-y-10">
      <section className="iso-floor -mx-4 rounded-none px-4 py-8 md:mx-0 md:rounded-2xl md:border md:border-line md:px-8">
        <p className="text-sm font-medium text-accent">{h.kicker(HOTELS[hotel].label, t.hotel.regions[hotel])}</p>
        <h1 className="mt-2 max-w-2xl font-display text-3xl font-bold text-text md:text-4xl">{h.title}</h1>
        <p className="mt-3 max-w-2xl text-text-2">{h.intro}</p>
        <div className="mt-6 max-w-2xl">
          <SearchBox hotel={hotel} size="lg" />
        </div>
        <p className="mt-4 text-sm text-text-2">
          {view.meta.generatedAt ? (
            <>
              {h.lastScan} <TimeAgo iso={view.meta.generatedAt} />
              {view.meta.scan?.selected ? h.consulted(f.int(view.meta.scan.scanned)) : ""}
              {h.liveNote}{" "}
              <Link prefetch={false} href={href(`/${hotel}/acerca`)} className="text-accent hover:underline">
                {h.howFresh}
              </Link>
            </>
          ) : (
            h.noScans
          )}
        </p>
      </section>

      {cards.length > 0 && (
        <section aria-label={p.categories.homeTitle}>
          <SectionTitle
            title={p.categories.homeTitle}
            hint={p.categories.homeHint}
            href={href(`/${hotel}/categorias`)}
            linkLabel={p.categories.index}
          />
          <ul className="flex flex-wrap gap-2">
            {cards.map((c) => (
              <li key={c.slug}>
                <Link
                  prefetch={false}
                  href={href(`/${hotel}/categorias/${c.slug}`)}
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-text hover:bg-surface-2"
                >
                  {categoryBySlug(c.slug)?.label[lang]}
                  <span className="tnum text-xs text-muted">{f.int(c.count)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!view.meta.hasData && <Notice tone="warn">{h.noData}</Notice>}

      {view.totals && (
        <section aria-label={h.summaryAria} className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label={h.active} value={f.compact(view.totals.active)} sub={h.activeSub} />
          <StatTile label={h.withOffers} value={f.compact(view.totals.withOffers)} />
          <StatTile label={h.sold} value={f.compact(view.totals.sold7)} sub={h.last7} />
          <StatTile
            label={h.credits}
            value={
              <span className="inline-flex items-center gap-1.5">
                {f.compact(view.totals.credits7)}
                <CoinGlyph className="h-5 w-5" />
              </span>
            }
            sub={h.last7}
          />
        </section>
      )}

      {view.meta.hasData && <MarketFlowCard flow={flow} title={t.marketFlow.homeTitle} tiles={false} />}

      <JoinChannels />

      {view.meta.hasData && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="card p-4">
            <SectionTitle title={h.bestSellers} hint={h.bestSellersHint} href={href(`/${hotel}/rankings/vendidos`)} />
            <FurniMiniList hotel={hotel} rows={view.vendidos} metric="s7" empty={h.noSales} />
          </section>
          <section className="card p-4">
            <SectionTitle title={h.deals} hint={h.dealsHint} href={href(`/${hotel}/ofertas`)} linkLabel={h.seeDeals} />
            <FurniMiniList hotel={hotel} rows={view.ofertas} metric="pct" empty={h.noDeals} />
          </section>
          <section className="card p-4">
            <SectionTitle title={h.ups} hint={h.changeHint} href={href(`/${hotel}/rankings/subas`)} />
            <FurniMiniList hotel={hotel} rows={view.subas} metric="change" empty={h.noUps} />
          </section>
          <section className="card p-4">
            <SectionTitle title={h.downs} hint={h.changeHint} href={href(`/${hotel}/rankings/bajas`)} />
            <FurniMiniList hotel={hotel} rows={view.bajas} metric="change" empty={h.noDowns} />
          </section>
        </div>
      )}
    </div>
  );
}

export default function HotelHome({ params }: PageProps<"/[lang]/[hotel]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <HotelHomeContent params={params} />
    </Suspense>
  );
}
