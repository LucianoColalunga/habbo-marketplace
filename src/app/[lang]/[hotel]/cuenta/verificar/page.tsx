import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { VerifyEmail } from "@/components/account/TokenPages";
import { PageSkeleton } from "@/components/Skeletons";
import { isEnabledHotel } from "@/lib/hotels";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  // El enlace lleva un código personal: fuera de los buscadores y sin mandarlo a otros sitios.
  return { title: t.account.verifyTitle, robots: { index: false, follow: false }, referrer: "no-referrer" };
}

async function Content({ params }: Pick<PageProps<"/[lang]/[hotel]/cuenta/verificar">, "params">) {
  const { hotel } = await params;
  if (!isEnabledHotel(hotel)) notFound();
  const { t } = await getI18n();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-text">{t.account.verifyTitle}</h1>
      <VerifyEmail hotel={hotel} />
    </div>
  );
}

export default function VerificarPage({ params }: PageProps<"/[lang]/[hotel]/cuenta/verificar">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}
