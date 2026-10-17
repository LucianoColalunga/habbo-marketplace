import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FurniIcon } from "@/components/FurniIcon";
import { SearchBox } from "@/components/SearchBox";
import { Credits } from "@/components/ui";
import { searchFurni } from "@/lib/data/views";
import { isEnabledHotel, type HotelCode } from "@/lib/hotels";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { p } = await getI18n();
  return { title: p.search.metaTitle };
}

export default function BuscarPage({ params, searchParams }: PageProps<"/[lang]/[hotel]/buscar">) {
  return (
    <Suspense fallback={<div className="skeleton h-64" />}>
      <BuscarContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function BuscarContent({ params, searchParams }: PageProps<"/[lang]/[hotel]/buscar">) {
  const { hotel } = await params;
  if (!isEnabledHotel(hotel)) notFound();
  const { p } = await getI18n();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-text">{p.search.title}</h1>
      <div className="max-w-2xl">
        <SearchBox hotel={hotel} size="lg" />
      </div>
      <Suspense fallback={<div className="skeleton h-64" />}>
        <Results hotel={hotel} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Results({
  hotel,
  searchParams,
}: {
  hotel: HotelCode;
  searchParams: PageProps<"/[lang]/[hotel]/buscar">["searchParams"];
}) {
  const [{ q: raw }, { p, t, f, href }] = await Promise.all([searchParams, getI18n()]);
  const s = p.search;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
  if (q.length < 2) return <p className="text-text-2">{s.min2}</p>;
  const results = await searchFurni(hotel, q, 60);
  if (results.length === 0) return <p className="text-text-2">{s.none(q)}</p>;
  return (
    <div>
      <p className="mb-3 text-sm text-text-2">
        {results.length === 60 ? s.first60 : s.results(results.length)}
        {s.forQ(q)}
      </p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((r) => (
          <li key={r.k}>
            <Link
              prefetch={false}
              href={href(`/${hotel}/furni/${encodeURIComponent(r.k)}`)}
              className="card flex items-center gap-3 p-3 hover:bg-surface-2"
            >
              <FurniIcon k={r.k} r={r.r} size={48} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-text">{r.n}</span>
                <span className="block text-sm text-text-2">
                  {r.oo > 0 ? (
                    <>
                      {t.common.from} <Credits value={r.cp} /> · {t.common.forSale(f.int(r.oo))}
                    </>
                  ) : r.hasActivity ? (
                    s.noOpenOffers
                  ) : (
                    s.noMarket
                  )}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
