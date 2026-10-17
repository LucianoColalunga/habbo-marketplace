import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FurniIcon } from "@/components/FurniIcon";
import { SearchBox } from "@/components/SearchBox";
import { Credits } from "@/components/ui";
import { searchFurni } from "@/lib/data/views";
import { formatInt } from "@/lib/format";
import { isEnabledHotel, type HotelCode } from "@/lib/hotels";

export const metadata: Metadata = { title: "Buscar furni" };

export default function BuscarPage({ params, searchParams }: PageProps<"/[hotel]/buscar">) {
  return (
    <Suspense fallback={<div className="skeleton h-64" />}>
      <BuscarContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function BuscarContent({ params, searchParams }: PageProps<"/[hotel]/buscar">) {
  const { hotel } = await params;
  if (!isEnabledHotel(hotel)) notFound();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-text">Buscar furni</h1>
      <div className="max-w-2xl">
        <SearchBox hotel={hotel} size="lg" />
      </div>
      <Suspense fallback={<div className="skeleton h-64" />}>
        <Results hotel={hotel} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Results({ hotel, searchParams }: { hotel: HotelCode; searchParams: PageProps<"/[hotel]/buscar">["searchParams"] }) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
  if (q.length < 2) return <p className="text-text-2">Escribí al menos 2 letras.</p>;
  const results = await searchFurni(hotel, q, 60);
  if (results.length === 0) return <p className="text-text-2">No encontramos furnis intercambiables para «{q}».</p>;
  return (
    <div>
      <p className="mb-3 text-sm text-text-2">
        {results.length === 60 ? "Primeros 60 resultados" : `${results.length} resultados`} para «{q}»
      </p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((r) => (
          <li key={r.k}>
            <Link href={`/${hotel}/furni/${encodeURIComponent(r.k)}`} className="card flex items-center gap-3 p-3 hover:bg-surface-2">
              <FurniIcon k={r.k} r={r.r} size={48} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-text">{r.n}</span>
                <span className="block text-sm text-text-2">
                  {r.oo > 0 ? (
                    <>
                      desde <Credits value={r.cp} /> · {formatInt(r.oo)} en venta
                    </>
                  ) : r.hasActivity ? (
                    "sin ofertas abiertas"
                  ) : (
                    "sin datos de mercado todavía"
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
