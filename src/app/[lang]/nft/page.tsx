import type { Metadata } from "next";
import Link from "next/link";
import { TimeAgo } from "@/components/Freshness";
import { NftImage } from "@/components/nft/NftImage";
import { NftMiniList } from "@/components/nft/NftList";
import { SearchBox } from "@/components/SearchBox";
import { Notice, SectionTitle, StatTile } from "@/components/ui";
import { pageMeta } from "@/lib/i18n/seo";
import { getI18n } from "@/lib/i18n/server";
import { getNftHome } from "@/lib/nft/views";

export async function generateMetadata(): Promise<Metadata> {
  const { lang, p } = await getI18n();
  return pageMeta({ lang, p, section: "nft", path: "/nft", title: p.seo.nftHome, description: p.meta.nftDescription });
}

export default async function NftHome() {
  const [view, { p, f, href }] = await Promise.all([getNftHome(), getI18n()]);
  const h = p.nft.home;
  return (
    <div className="space-y-10">
      <section className="nft-grid -mx-4 px-4 py-8 md:mx-0 md:rounded-2xl md:border md:border-[#f5b942]/30 md:px-8">
        <p className="text-sm font-medium text-accent">{h.kicker}</p>
        <h1 className="mt-2 max-w-2xl font-display text-3xl font-bold text-text md:text-4xl">{h.title}</h1>
        <p className="mt-3 max-w-2xl text-text-2">{h.intro}</p>
        <div className="mt-6 max-w-2xl">
          <SearchBox nft size="lg" />
        </div>
        <p className="mt-4 text-sm text-text-2">
          {view.meta.generatedAt ? (
            <>
              {h.lastScan} <TimeAgo iso={view.meta.generatedAt} />. {h.rate(f.usd(view.meta.ethUsd))} {h.liveNote}{" "}
              <Link prefetch={false} href={href("/nft/acerca")} className="text-accent hover:underline">
                {h.where}
              </Link>
            </>
          ) : (
            h.noScans
          )}
        </p>
      </section>

      {!view.meta.hasData && <Notice tone="warn">{h.noData}</Notice>}

      {view.totals && (
        <section aria-label={h.summaryAria} className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label={h.listed} value={f.compact(view.totals.listed)} />
          <StatTile label={h.sales} value={f.compact(view.totals.sales7)} sub={h.last7} />
          <StatTile label={h.volume} value={f.usd(view.totals.volume7, true)} sub={h.last7} />
          <StatTile label={h.models} value={f.compact(view.totals.models)} sub={h.modelsSub} />
        </section>
      )}

      <section aria-label={h.collectionsTitle}>
        <SectionTitle title={h.collectionsTitle} hint={h.collectionsHint} />
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {view.collections.map((c) => (
            <li key={c.slug}>
              <Link prefetch={false} href={href(`/nft/coleccion/${c.slug}`)} className="card flex h-full flex-col gap-2 p-4 hover:bg-surface-2">
                <span className="flex items-center gap-3">
                  <NftImage src={c.img} size={40} />
                  <span className="font-display font-bold text-text">{p.nft.collections[c.slug]}</span>
                </span>
                <span className="text-sm text-text-2">{h.colListed(f.int(c.listed), f.usd(c.floorUsd))}</span>
                <span className="text-xs text-muted">{h.colSales(f.int(c.sales7), f.usd(c.volume7, true))}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {view.meta.hasData && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="card p-4">
            <SectionTitle title={h.bestSellers} hint={h.bestSellersHint} href={href("/nft/rankings/vendidos")} />
            <NftMiniList rows={view.vendidos} metric="s7" empty={h.noSales} />
          </section>
          <section className="card p-4">
            <SectionTitle title={h.deals} hint={h.dealsHint} href={href("/nft/rankings/ofertas")} />
            <NftMiniList rows={view.ofertas} metric="discount" empty={h.noDeals} />
          </section>
          <section className="card p-4">
            <SectionTitle title={h.ups} hint={h.changeHint} href={href("/nft/rankings/subas")} />
            <NftMiniList rows={view.subas} metric="change" empty={h.needWeek} />
          </section>
          <section className="card p-4">
            <SectionTitle title={h.downs} hint={h.changeHint} href={href("/nft/rankings/bajas")} />
            <NftMiniList rows={view.bajas} metric="change" empty={h.needWeek} />
          </section>
        </div>
      )}
    </div>
  );
}
