import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DetectionsList } from "@/components/alerts/DetectionsList";
import { DealsTable } from "@/components/deals/DealsTable";
import { TimeAgo } from "@/components/Freshness";
import { JoinChannels } from "@/components/JoinChannels";
import { PageSkeleton } from "@/components/Skeletons";
import { Notice } from "@/components/ui";
import { getDealsView, getMarketMeta } from "@/lib/data/views";
import { HOTELS, isEnabledHotel } from "@/lib/hotels";
import { pageMeta } from "@/lib/i18n/seo";
import { getI18n } from "@/lib/i18n/server";
import { DEFAULT_DEAL_OPTIONS } from "@/lib/market/deals";

export async function generateMetadata({ params }: PageProps<"/[lang]/[hotel]/ofertas">): Promise<Metadata> {
  const [{ hotel }, { lang, p }] = await Promise.all([params, getI18n()]);
  if (!isEnabledHotel(hotel)) return { title: p.deals.metaTitle };
  const label = HOTELS[hotel].label;
  return pageMeta({ lang, p, path: `/${hotel}/ofertas`, title: p.seo.deals(label), description: p.seo.dealsDesc(label) });
}

async function OfertasPageContent({ params }: Pick<PageProps<"/[lang]/[hotel]/ofertas">, "params">) {
  const { hotel } = await params;
  if (!isEnabledHotel(hotel)) notFound();
  const [rows, meta, { p, t, href }] = await Promise.all([getDealsView(hotel, "pct", 100), getMarketMeta(hotel), getI18n()]);
  const o = DEFAULT_DEAL_OPTIONS;
  const d = p.deals;
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold text-text">{d.title(HOTELS[hotel].label)}</h1>
        <p className="mt-2 max-w-3xl text-text-2">
          {d.intro({ pct: Math.round(o.minDiscount * 100), sold7: o.minSold7, sold30: o.minSold30, ref: o.minRef })}
          {meta.generatedAt && (
            <>
              {" "}
              {t.common.lastScan} <TimeAgo iso={meta.generatedAt} />.
            </>
          )}
        </p>
      </header>

      <Notice>{d.notice}</Notice>

      <JoinChannels title={d.channelsTitle} />

      <section>
        <DealsTable hotel={hotel} rows={rows} />
      </section>

      <section className="card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-text">{d.forYourList}</h2>
          <Link prefetch={false} href={href(`/${hotel}/alertas`)} className="text-sm text-accent hover:underline">
            {d.configure}
          </Link>
        </div>
        <DetectionsList />
      </section>
    </div>
  );
}

export default function OfertasPage({ params }: PageProps<"/[lang]/[hotel]/ofertas">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OfertasPageContent params={params} />
    </Suspense>
  );
}
