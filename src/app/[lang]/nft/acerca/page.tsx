import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { TimeAgo } from "@/components/Freshness";
import { homeHotel } from "@/lib/i18n/config";
import { pageMeta } from "@/lib/i18n/seo";
import { getI18n } from "@/lib/i18n/server";
import { NFT_COLLECTIONS } from "@/lib/nft/collections";
import { getNftMeta } from "@/lib/nft/views";

export async function generateMetadata(): Promise<Metadata> {
  const { lang, p } = await getI18n();
  return pageMeta({ lang, p, section: "nft", path: "/nft/acerca", title: p.nft.about.metaTitle, description: p.seo.nftAboutDesc });
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card space-y-2 p-5">
      <h2 className="font-display text-xl font-bold text-text">{title}</h2>
      <div className="space-y-2 text-text-2 [&_strong]:text-text">{children}</div>
    </section>
  );
}

export default async function NftAcercaPage() {
  const [meta, { lang, p, f, href }] = await Promise.all([getNftMeta(), getI18n()]);
  const a = p.nft.about;
  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="font-display text-3xl font-bold text-text">{a.title}</h1>

      <Block title={a.whatTitle}>
        {a.what(
          <Link prefetch={false} href={href(`/${homeHotel(lang)}`)} className="text-accent hover:underline">
            {a.marketLink}
          </Link>,
        )}
      </Block>

      <Block title={a.sourcesTitle}>
        {a.sources(meta.ethUsd ? f.usd(meta.ethUsd) : null)}
        <p className="text-sm">{a.included}</p>
        <ul className="list-disc space-y-1 pl-5 font-mono text-xs">
          {NFT_COLLECTIONS.map((c) => (
            <li key={c.slug}>
              {c.official}: {c.address}
            </li>
          ))}
        </ul>
      </Block>

      <Block title={a.freshTitle}>{a.fresh(meta.generatedAt ? <TimeAgo iso={meta.generatedAt} /> : null)}</Block>

      <Block title={a.limitsTitle}>{a.limits}</Block>

      <Block title={a.noticeTitle}>
        <p>{a.notice}</p>
      </Block>
    </div>
  );
}
