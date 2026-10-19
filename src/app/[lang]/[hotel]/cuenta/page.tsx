import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AccountPanel } from "@/components/account/AccountPanel";
import { PageSkeleton } from "@/components/Skeletons";
import { isEnabledHotel } from "@/lib/hotels";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  // Página personal: no tiene sentido en los buscadores.
  return { title: t.account.title, robots: { index: false, follow: false } };
}

async function Content({ params }: Pick<PageProps<"/[lang]/[hotel]/cuenta">, "params">) {
  const { hotel } = await params;
  if (!isEnabledHotel(hotel)) notFound();
  const { t } = await getI18n();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-text">{t.account.title}</h1>
      <AccountPanel hotel={hotel} />
    </div>
  );
}

export default function CuentaPage({ params }: PageProps<"/[lang]/[hotel]/cuenta">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}
