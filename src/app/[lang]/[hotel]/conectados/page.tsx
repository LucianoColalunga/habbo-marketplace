import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OnlineUsers } from "@/components/OnlineUsers";
import { PageSkeleton } from "@/components/Skeletons";
import { Notice } from "@/components/ui";
import { isEnabledHotel } from "@/lib/hotels";
import { pageMeta } from "@/lib/i18n/seo";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata({ params }: PageProps<"/[lang]/[hotel]/conectados">): Promise<Metadata> {
  const [{ hotel }, { lang, p, t }] = await Promise.all([params, getI18n()]);
  if (!isEnabledHotel(hotel)) return { title: t.online.title };
  return pageMeta({ lang, p, path: `/${hotel}/conectados`, title: t.online.title, description: t.online.intro });
}

async function Content({ params }: Pick<PageProps<"/[lang]/[hotel]/conectados">, "params">) {
  const { hotel } = await params;
  if (!isEnabledHotel(hotel)) notFound();
  const { t } = await getI18n();
  return (
    <div className="space-y-5">
      <header className="max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-text">{t.online.title}</h1>
        <p className="mt-2 text-text-2">{t.online.intro}</p>
      </header>
      <OnlineUsers />
      <Notice>{t.online.legacyNote}</Notice>
    </div>
  );
}

export default function ConectadosPage({ params }: PageProps<"/[lang]/[hotel]/conectados">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}
