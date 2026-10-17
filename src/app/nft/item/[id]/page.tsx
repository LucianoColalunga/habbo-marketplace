import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { NftImage } from "@/components/nft/NftImage";
import { NftLive } from "@/components/nft/NftLive";
import { PageSkeleton } from "@/components/Skeletons";
import { collectionBySlug } from "@/lib/nft/collections";
import { getNftItem } from "@/lib/nft/views";

const SAFE_ID = /^[0-9a-f-]{36}$/i;

export function generateStaticParams() {
  // Un modelo de ejemplo; el resto se genera la primera vez que alguien lo visita.
  return [{ id: "019c05de-fd53-99ad-99be-cb21be61ab86" }];
}

export async function generateMetadata({ params }: PageProps<"/nft/item/[id]">): Promise<Metadata> {
  const { id } = await params;
  if (!SAFE_ID.test(id)) return { title: "NFT no encontrado" };
  const { row } = await getNftItem(id);
  return row
    ? { title: row.n, description: `Precio piso, ventas e historial del NFT ${row.n} de Habbo en Immutable.` }
    : { title: "NFT no encontrado" };
}

async function Content({ params }: Pick<PageProps<"/nft/item/[id]">, "params">) {
  const { id } = await params;
  if (!SAFE_ID.test(id)) notFound();
  const item = await getNftItem(id);
  if (!item.row || !item.collection) notFound();
  const r = item.row;
  const col = collectionBySlug(item.collection);
  const chips = [r.rarity, r.type, r.subType, r.source && `Origen: ${r.source}`, r.set && `Set: ${r.set}`, r.code].filter(Boolean);
  return (
    <article className="space-y-6">
      <nav className="text-sm text-text-2" aria-label="Ruta">
        <Link href="/nft" className="hover:text-text">
          NFT
        </Link>{" "}
        /{" "}
        <Link href={`/nft/coleccion/${col.slug}`} className="hover:text-text">
          {col.name}
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
            {r.supply > 0 && <li className="rounded-full border border-line px-2.5 py-1">Existen {r.supply.toLocaleString("es-AR")}</li>}
          </ul>
        </div>
      </header>
      <NftLive id={r.id} contract={r.c} stored={r} days={item.days} snaps={item.snaps} />
      <p className="text-sm text-text-2">
        Este NFT se compra y vende con criptomonedas en el marketplace de Immutable (por ejemplo desde{" "}
        <a href="https://collectibles.habbo.com/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
          Habbo Collectibles
        </a>
        ). No se consigue con créditos del juego.
      </p>
    </article>
  );
}

export default function NftItemPage({ params }: PageProps<"/nft/item/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}
