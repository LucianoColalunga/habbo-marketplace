import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { YourPlan } from "@/components/plans/YourPlan";
import { PageSkeleton } from "@/components/Skeletons";
import { isEnabledHotel } from "@/lib/hotels";
import { COMPARISON, PLAN_FEATURES, PLANS_TEXT, type FeatureStatus } from "@/lib/i18n/plans";
import { pageMeta } from "@/lib/i18n/seo";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata({ params }: PageProps<"/[lang]/[hotel]/planes">): Promise<Metadata> {
  const [{ hotel }, { lang, p }] = await Promise.all([params, getI18n()]);
  const t = PLANS_TEXT[lang];
  if (!isEnabledHotel(hotel)) return { title: t.metaTitle };
  return pageMeta({ lang, p, path: `/${hotel}/planes`, title: t.metaTitle, description: t.metaDesc });
}

const STATUS_STYLE: Record<FeatureStatus, string> = {
  yes: "bg-up/15 text-up",
  partial: "bg-accent/15 text-accent",
  soon: "bg-surface-3 text-text-2",
  no: "bg-surface-3 text-muted",
};

/** ✓ o — a la vista, y "Sí" / "No" para los lectores de pantalla. */
function Mark({ on, yes, no }: { on: boolean; yes: string; no: string }) {
  return (
    <>
      <span aria-hidden="true" className={on ? "text-up" : "text-muted"}>
        {on ? "✓" : "—"}
      </span>
      <span className="sr-only">{on ? yes : no}</span>
    </>
  );
}

async function Content({ params }: Pick<PageProps<"/[lang]/[hotel]/planes">, "params">) {
  const { hotel } = await params;
  if (!isEnabledHotel(hotel)) notFound();
  const { lang } = await getI18n();
  const t = PLANS_TEXT[lang];
  const card = "card flex flex-col gap-2 p-5";

  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-text">{t.title}</h1>
        <p className="mt-2 text-text-2">{t.intro}</p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-label={t.title}>
        <div className={card}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-2xl font-bold text-text">{t.standard}</h2>
            <YourPlan plan="standard" hotel={hotel} />
          </div>
          <p className="font-display text-xl font-bold text-up">{t.standardPrice}</p>
          <p className="text-sm text-text-2">{t.standardHint}</p>
        </div>
        <div className={`${card} border-accent/60`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-2xl font-bold text-accent">{t.vip}</h2>
            <YourPlan plan="vip" hotel={hotel} />
          </div>
          <p className="font-display text-xl font-bold text-text">{t.vipPrice}</p>
          <p className="text-sm text-text-2">{t.vipHint}</p>
        </div>
      </section>

      <section className="card relative overflow-x-auto p-4" aria-label={t.colFeature}>
        <table className="w-full min-w-[28rem] text-sm">
          <thead className="text-left text-text-2">
            <tr className="border-b border-line">
              <th className="py-2 pr-3 font-medium">{t.colFeature}</th>
              <th className="py-2 pr-3 text-center font-medium">{t.standard}</th>
              <th className="py-2 text-center font-medium text-accent">{t.vip}</th>
            </tr>
          </thead>
          <tbody className="text-text">
            {PLAN_FEATURES.map((f) => (
              <tr key={f.key} className="border-b border-line/60 last:border-0">
                <td className="py-2 pr-3">{t.features[f.key]}</td>
                <td className="py-2 pr-3 text-center">
                  <Mark on={f.standard} yes={t.status.yes} no={t.no} />
                </td>
                <td className="py-2 text-center">
                  <Mark on={f.vip} yes={t.status.yes} no={t.no} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-3" aria-label={t.compareTitle}>
        <div className="max-w-3xl">
          <h2 className="font-display text-2xl font-bold text-text">{t.compareTitle}</h2>
          <p className="mt-1 text-sm text-text-2">{t.compareIntro}</p>
        </div>
        <div className="card relative overflow-x-auto p-4">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="text-left text-text-2">
              <tr className="border-b border-line">
                <th className="py-2 pr-3 font-medium">{t.colFeature}</th>
                <th className="py-2 pr-3 text-center font-medium">{t.colTheirs}</th>
                <th className="py-2 font-medium">{t.colOurs}</th>
              </tr>
            </thead>
            <tbody className="text-text">
              {COMPARISON.map((row) => {
                const [label, note] = t.rows[row.key];
                return (
                  <tr key={row.key} className="border-b border-line/60 align-top last:border-0">
                    <td className="py-2 pr-3">{label}</td>
                    <td className="py-2 pr-3 text-center">
                      <Mark on yes={t.status.yes} no={t.no} />
                    </td>
                    <td className="py-2">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-bold ${STATUS_STYLE[row.stats]}`}>{t.status[row.stats]}</span>
                      {note && <span className="mt-1 block text-xs text-text-2">{note}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card space-y-2 p-5" aria-label={t.extrasTitle}>
        <h2 className="font-display text-xl font-bold text-text">{t.extrasTitle}</h2>
        <ul className="list-disc space-y-1 pl-5 text-text-2">
          {t.extras.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function PlanesPage({ params }: PageProps<"/[lang]/[hotel]/planes">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}
