import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/Skeletons";
import { isEnabledHotel } from "@/lib/hotels";
import { pageMeta } from "@/lib/i18n/seo";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata({ params }: PageProps<"/[lang]/[hotel]/privacidad">): Promise<Metadata> {
  const [{ hotel }, { lang, p }] = await Promise.all([params, getI18n()]);
  return pageMeta({ lang, p, path: `/${hotel}/privacidad`, title: p.privacy.metaTitle, description: p.privacy.metaDesc });
}

async function Content({ params }: Pick<PageProps<"/[lang]/[hotel]/privacidad">, "params">) {
  const { hotel } = await params;
  if (!isEnabledHotel(hotel)) notFound();
  const { p } = await getI18n();
  const t = p.privacy;
  return (
    <div className="max-w-3xl space-y-5">
      <header>
        <h1 className="font-display text-3xl font-bold text-text">{t.title}</h1>
        <p className="mt-2 text-text-2">{t.intro}</p>
      </header>
      {t.sections.map((s) => (
        <section key={s.title} className="card space-y-2 p-5">
          <h2 className="font-display text-xl font-bold text-text">{s.title}</h2>
          <ul className="list-disc space-y-1 pl-5 text-text-2">
            {s.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-sm text-text-2">{t.change}</p>
    </div>
  );
}

export default function PrivacidadPage({ params }: PageProps<"/[lang]/[hotel]/privacidad">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}
