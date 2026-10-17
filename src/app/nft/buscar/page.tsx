import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NftImage } from "@/components/nft/NftImage";
import { SearchBox } from "@/components/SearchBox";
import { formatInt, formatUsd } from "@/lib/format";
import { searchNft } from "@/lib/nft/views";

export const metadata: Metadata = { title: "Buscar NFT" };

async function Results({ searchParams }: { searchParams: PageProps<"/nft/buscar">["searchParams"] }) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
  if (q.length < 2) return <p className="text-text-2">Escribí al menos 2 letras.</p>;
  const results = await searchNft(q, 60);
  if (results.length === 0) return <p className="text-text-2">No encontramos NFT para «{q}».</p>;
  return (
    <div>
      <p className="mb-3 text-sm text-text-2">
        {results.length === 60 ? "Primeros 60 resultados" : `${results.length} resultados`} para «{q}»
      </p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((r) => (
          <li key={r.id}>
            <Link href={`/nft/item/${r.id}`} className="card flex items-center gap-3 p-3 hover:bg-surface-2">
              <NftImage src={r.img} size={48} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-text">{r.n}</span>
                <span className="block text-sm text-text-2">
                  {r.floorUsd !== null ? `piso ${formatUsd(r.floorUsd)}` : "sin publicaciones"} · {formatInt(r.s7)} ventas en 7 d
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function NftBuscarPage({ searchParams }: PageProps<"/nft/buscar">) {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-text">Buscar NFT</h1>
      <div className="max-w-2xl">
        <SearchBox nft size="lg" />
      </div>
      <Suspense fallback={<div className="skeleton h-64" />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
