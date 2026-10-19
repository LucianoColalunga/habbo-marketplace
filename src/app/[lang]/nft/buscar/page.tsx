import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NftImage } from "@/components/nft/NftImage";
import { SearchBox } from "@/components/SearchBox";
import { pageMeta } from "@/lib/i18n/seo";
import { getI18n } from "@/lib/i18n/server";
import { searchNft } from "@/lib/nft/views";

export async function generateMetadata(): Promise<Metadata> {
  const { lang, p } = await getI18n();
  return pageMeta({
    lang,
    p,
    section: "nft",
    path: "/nft/buscar",
    title: p.search.nftMetaTitle,
    description: p.meta.nftDescription,
    noindex: true,
  });
}

async function Results({ searchParams }: { searchParams: PageProps<"/[lang]/nft/buscar">["searchParams"] }) {
  const [{ q: raw }, { p, f, href }] = await Promise.all([searchParams, getI18n()]);
  const s = p.search;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
  if (q.length < 2) return <p className="text-text-2">{s.min2}</p>;
  const results = await searchNft(q, 60);
  if (results.length === 0) return <p className="text-text-2">{s.noneNft(q)}</p>;
  return (
    <div>
      <p className="mb-3 text-sm text-text-2">
        {results.length === 60 ? s.first60 : s.results(results.length)}
        {s.forQ(q)}
      </p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((r) => (
          <li key={r.id}>
            <Link prefetch={false} href={href(`/nft/item/${r.id}`)} className="card flex items-center gap-3 p-3 hover:bg-surface-2">
              <NftImage src={r.img} size={48} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-text">{r.n}</span>
                <span className="block text-sm text-text-2">
                  {r.floorUsd !== null ? s.floor(f.usd(r.floorUsd)) : s.noListings} · {s.sales7(f.int(r.s7))}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function NftBuscarPage({ searchParams }: PageProps<"/[lang]/nft/buscar">) {
  const { p } = await getI18n();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-text">{p.search.nftTitle}</h1>
      <div className="max-w-2xl">
        <SearchBox nft size="lg" />
      </div>
      <Suspense fallback={<div className="skeleton h-64" />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
