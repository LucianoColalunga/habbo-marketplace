import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FurniIcon } from "@/components/FurniIcon";
import { ItemLive } from "@/components/item/ItemLive";
import { WatchButton } from "@/components/alerts/WatchButton";
import { Notice } from "@/components/ui";
import { getItemBase, getItemHistory, getMarketMeta } from "@/lib/data/views";
import { enabledHotels, HOTELS, isEnabledHotel, type HotelCode } from "@/lib/hotels";
import { getI18n } from "@/lib/i18n/server";

export function generateStaticParams() {
  // Un furni conocido de ejemplo; el resto se genera la primera vez que alguien lo visita.
  return [{ classname: "throne" }];
}

function decodeKey(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function generateMetadata({ params }: PageProps<"/[lang]/[hotel]/furni/[classname]">): Promise<Metadata> {
  const { hotel, classname } = await params;
  if (!isEnabledHotel(hotel)) return {};
  const [base, { p }] = await Promise.all([getItemBase(hotel, decodeKey(classname)), getI18n()]);
  if (!base.item) return { title: p.item.notFoundTitle };
  return {
    title: `${base.item.n} (${HOTELS[hotel].label})`,
    description: p.item.metaDesc(base.item.n, HOTELS[hotel].label),
  };
}

export default function FurniPage({ params }: PageProps<"/[lang]/[hotel]/furni/[classname]">) {
  return (
    <Suspense fallback={<ItemSkeleton />}>
      <ItemContent params={params} />
    </Suspense>
  );
}

async function ItemContent({ params }: Pick<PageProps<"/[lang]/[hotel]/furni/[classname]">, "params">) {
  const { hotel, classname } = await params;
  if (!isEnabledHotel(hotel)) notFound();
  const k = decodeKey(classname);
  const [base, history, meta, { p, href }] = await Promise.all([
    getItemBase(hotel, k),
    getItemHistory(hotel, k),
    getMarketMeta(hotel),
    getI18n(),
  ]);
  const t = p.item;
  if (!base.item) {
    if (meta.catalogSize === 0) {
      return <Notice tone="warn">{t.catalogPending}</Notice>;
    }
    notFound();
  }
  const item = base.item;
  const others = enabledHotels().filter((h) => h !== hotel);

  return (
    <article className="space-y-6">
      <nav className="text-sm text-text-2" aria-label={t.breadcrumb}>
        <Link prefetch={false} href={href(`/${hotel}`)} className="hover:text-text">
          {t.home}
        </Link>{" "}
        / <span className="text-text">{item.n}</span>
      </nav>
      <header className="flex flex-wrap items-start gap-4">
        <FurniIcon k={item.k} r={item.r} size={88} alt={item.n} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-bold text-text">{item.n}</h1>
          {item.d && <p className="mt-1 text-text-2">{item.d}</p>}
          <ul className="mt-3 flex flex-wrap gap-2 text-xs text-text-2">
            <li className="rounded-full border border-line px-2.5 py-1">{t.category[item.c] ?? item.c}</li>
            <li className="rounded-full border border-line px-2.5 py-1">{item.t === "w" ? t.wall : t.floor}</li>
            {item.l && <li className="rounded-full border border-line px-2.5 py-1">{t.line(item.l)}</li>}
            <li className="rounded-full border border-line px-2.5 py-1 font-mono">{item.k}</li>
            <li className="rounded-full border border-line px-2.5 py-1">{t.hotel(HOTELS[hotel].label)}</li>
          </ul>
        </div>
        <div className="w-full sm:w-auto">
          <WatchButton hotel={hotel} item={{ k: item.k, n: item.n, t: item.t, r: item.r }} />
        </div>
      </header>

      <ItemLive
        hotel={hotel}
        k={item.k}
        t={item.t}
        stored={base.summary}
        storedAt={base.summary ? new Date(base.summary.at * 60_000).toISOString() : null}
        days={history.days}
        snaps={history.snaps}
      />

      {others.length > 0 && (
        <section className="text-sm text-text-2">
          {t.otherHotels}{" "}
          {others.map((h: HotelCode, i) => (
            <span key={h}>
              {i > 0 && " · "}
              <Link prefetch={false} className="text-accent hover:underline" href={href(`/${h}/furni/${encodeURIComponent(item.k)}`)}>
                {HOTELS[h].label}
              </Link>
            </span>
          ))}{" "}
          <span className="text-muted">{t.ownEconomy}</span>
        </section>
      )}
    </article>
  );
}

function ItemSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="flex gap-4">
        <div className="skeleton h-22 w-22" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-8 w-1/2" />
          <div className="skeleton h-4 w-3/4" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skeleton h-24" />
        ))}
      </div>
      <div className="skeleton h-72" />
    </div>
  );
}
