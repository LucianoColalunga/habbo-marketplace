import Link from "next/link";
import { FurniTable, type Metric } from "@/components/FurniList";
import { TimeAgo } from "@/components/Freshness";
import { Notice } from "@/components/ui";
import { RANKINGS, type RankingKind } from "@/lib/data/rankings";
import { getMarketMeta, getRankingView } from "@/lib/data/views";
import { HOTELS, type HotelCode } from "@/lib/hotels";
import { getI18n } from "@/lib/i18n/server";

const METRIC: Record<RankingKind, Metric> = {
  vendidos: "s7",
  volumen: "c7",
  subas: "change",
  bajas: "change",
  caros: "ref",
  ofertados: "oo",
};

export async function RankingView({ hotel, kind }: { hotel: HotelCode; kind: RankingKind }) {
  const [rows, meta, { p, href }] = await Promise.all([getRankingView(hotel, kind, 100), getMarketMeta(hotel), getI18n()]);
  const r = p.rankings;
  const info = r.kinds[kind];
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-3xl font-bold text-text">{r.title(HOTELS[hotel].label)}</h1>
        <p className="mt-1 text-text-2">
          {meta.generatedAt ? (
            <>
              {r.computedA}
              <TimeAgo iso={meta.generatedAt} />
              {r.computedB}
            </>
          ) : (
            r.noScans
          )}
        </p>
      </header>
      <nav aria-label={r.kindAria} className="flex flex-wrap gap-2">
        {(Object.keys(RANKINGS) as RankingKind[]).map((k) => (
          <Link
            prefetch={false}
            key={k}
            href={href(`/${hotel}/rankings/${k}`)}
            aria-current={k === kind ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              k === kind ? "border-accent bg-accent/15 text-text" : "border-line text-text-2 hover:bg-surface"
            }`}
          >
            {r.kinds[k].title}
          </Link>
        ))}
      </nav>
      <div>
        <h2 className="font-display text-xl font-bold text-text">{info.title}</h2>
        <p className="mb-3 text-sm text-text-2">{info.hint}</p>
        {!meta.hasData ? <Notice tone="warn">{r.noData}</Notice> : null}
        <FurniTable hotel={hotel} rows={rows} metric={METRIC[kind]} />
      </div>
    </div>
  );
}
