import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { PageSkeleton } from "@/components/Skeletons";
import { isEnabledHotel } from "@/lib/hotels";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.admin.title, robots: { index: false, follow: false } };
}

/** La página es pública pero vacía: los datos los trae el panel solo si la cuenta es de administración. */
async function Content({ params }: Pick<PageProps<"/[lang]/[hotel]/admin">, "params">) {
  const { hotel } = await params;
  if (!isEnabledHotel(hotel)) notFound();
  const { t } = await getI18n();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-text">{t.admin.title}</h1>
      <AdminPanel />
    </div>
  );
}

export default function AdminPage({ params }: PageProps<"/[lang]/[hotel]/admin">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}
