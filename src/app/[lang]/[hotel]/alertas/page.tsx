import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AccountHint } from "@/components/account/AccountButton";
import { AlertsManager } from "@/components/alerts/AlertsManager";
import { JoinChannels } from "@/components/JoinChannels";
import { PageSkeleton } from "@/components/Skeletons";
import { Notice } from "@/components/ui";
import { enabledHotels, HOTELS, isEnabledHotel } from "@/lib/hotels";
import { pageMeta } from "@/lib/i18n/seo";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata({ params }: PageProps<"/[lang]/[hotel]/alertas">): Promise<Metadata> {
  const [{ hotel }, { lang, p }] = await Promise.all([params, getI18n()]);
  if (!isEnabledHotel(hotel)) return { title: p.alerts.metaTitle };
  return pageMeta({
    lang,
    p,
    path: `/${hotel}/alertas`,
    title: p.seo.alerts(HOTELS[hotel].label),
    description: p.seo.alertsDesc,
  });
}

async function AlertasPageContent({ params }: Pick<PageProps<"/[lang]/[hotel]/alertas">, "params">) {
  const { hotel } = await params;
  if (!isEnabledHotel(hotel)) notFound();
  const { p } = await getI18n();
  const a = p.alerts;
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-text">{a.title}</h1>
        <p className="mt-2 max-w-3xl text-text-2">{a.intro}</p>
        <div className="mt-2">
          <AccountHint hotel={hotel} />
        </div>
      </header>
      <Notice>{a.how}</Notice>
      <JoinChannels title={a.channelsTitle} note={a.channelsNote} />
      <AlertsManager hotel={hotel} hotels={enabledHotels()} />
    </div>
  );
}

export default function AlertasPage({ params }: PageProps<"/[lang]/[hotel]/alertas">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AlertasPageContent params={params} />
    </Suspense>
  );
}
