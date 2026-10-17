import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { TimeAgo } from "@/components/Freshness";
import { PageSkeleton } from "@/components/Skeletons";
import { getMarketMeta } from "@/lib/data/views";
import { HOTELS, isEnabledHotel } from "@/lib/hotels";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { p } = await getI18n();
  return { title: p.about.metaTitle };
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card space-y-2 p-5">
      <h2 className="font-display text-xl font-bold text-text">{title}</h2>
      <div className="space-y-2 text-text-2 [&_strong]:text-text">{children}</div>
    </section>
  );
}

async function AcercaPageContent({ params }: Pick<PageProps<"/[lang]/[hotel]/acerca">, "params">) {
  const { hotel } = await params;
  if (!isEnabledHotel(hotel)) notFound();
  const [meta, { p, f }] = await Promise.all([getMarketMeta(hotel), getI18n()]);
  const a = p.about;
  const label = HOTELS[hotel].label;
  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="font-display text-3xl font-bold text-text">{a.title}</h1>

      <Block title={a.sourcesTitle}>{a.sources}</Block>

      <Block title={a.freshTitle}>
        {a.fresh}
        {meta.scan && (
          <p className="text-sm">
            {a.scanLine(
              label,
              <TimeAgo iso={meta.generatedAt} />,
              f.int(meta.scan.scanned),
              f.int(meta.scan.requests),
              f.int(meta.catalogSize),
            )}
          </p>
        )}
      </Block>

      <Block title={a.limitsTitle}>{a.limits(label)}</Block>

      <Block title={a.privacyTitle}>
        <p>{a.privacy}</p>
      </Block>

      <Block title={a.legalTitle}>
        <p>{a.legal}</p>
      </Block>
    </div>
  );
}

export default function AcercaPage({ params }: PageProps<"/[lang]/[hotel]/acerca">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AcercaPageContent params={params} />
    </Suspense>
  );
}
