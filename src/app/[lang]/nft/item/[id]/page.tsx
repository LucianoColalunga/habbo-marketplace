import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NftImage } from "@/components/nft/NftImage";
import { NftLive } from "@/components/nft/NftLive";
import { PageSkeleton } from "@/components/Skeletons";
import { getI18n } from "@/lib/i18n/server";
import { collectionBySlug } from "@/lib/nft/collections";
import { getNftItem } from "@/lib/nft/views";

const SAFE_ID = /^[0-9a-f-]{36}$/i;

export function generateStaticParams() {
  // Un modelo de ejemplo; el resto se genera la primera vez que alguien lo visita.
  return [{ id: "019c05de-fd53-99ad-99be-cb21be61ab86" }];
}

export async function generateMetadata({ params }: PageProps<"/[lang]/nft/item/[id]">): Promise<Metadata> {
  const [{ id }, { p }] = await Promise.all([params, getI18n()]);
  if (!SAFE_ID.test(id)) return { title: p.nft.item.notFoundTitle };
  const { row } = await getNftItem(id);
  return row ? { title: row.n, description: p.nft.item.metaDesc(row.n) } : { title: p.nft.item.notFoundTitle };
}

async function Content({ params }: Pick<PageProps<"/[lang]/nft/item/[id]">, "params">) {
  const { id } = await params;
  if (!SAFE_ID.test(id)) notFound();
  const [item, { p, f, href }] = await Promise.all([getNftItem(id), getI18n()]);
  if (!item.row || !item.collection) notFound();
  const r = item.row;
  const t = p.nft.item;
  const col = collectionBySlug(item.collection);
  const chips = [r.rarity, r.type, r.subType, r.source && t.origin(r.source), r.set && t.set(r.set), r.code].filter(Boolean);
  return (
    <article className="space-y-6">
      <nav className="text-sm text-text-2" aria-label={p.item.breadcrumb}>
        <Link prefetch={false} href={href("/nft")} className="hover:text-text">
          NFT
        </Link>{" "}
        /{" "}
        <Link prefetch={false} href={href(`/nft/coleccion/${col.slug}`)} className="hover:text-text">
          {p.nft.collections[col.slug]}
        </Link>{" "}
        / <span className="text-text">{r.n}</span>
      </nav>
      <header className="flex flex-wrap items-start gap-4">
        <NftImage src={r.img} size={96} alt={r.n} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">NFT · {col.official}</p>
          <h1 className="font-display text-3xl font-bold text-text">{r.n}</h1>
          <ul className="mt-3 flex flex-wrap gap-2 text-xs text-text-2">
            {chips.map((c) => (
              <li key={String(c)} className="rounded-full border border-[#a78bfa]/40 px-2.5 py-1">
                {c}
              </li>
            ))}
            {r.supply > 0 && <li className="rounded-full border border-line px-2.5 py-1">{t.supply(f.int(r.supply))}</li>}
          </ul>
        </div>
      </header>
      <NftLive id={r.id} contract={r.c} stored={r} days={item.days} snaps={item.snaps} />
      <p className="text-sm text-text-2">
        {t.buy(
          <a href="https://collectibles.habbo.com/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            Habbo Collectibles
          </a>,
        )}
      </p>
    </article>
  );
}

export default function NftItemPage({ params }: PageProps<"/[lang]/nft/item/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}
