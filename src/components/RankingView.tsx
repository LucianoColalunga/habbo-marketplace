import Link from "next/link";
import { FurniTable, type Metric } from "@/components/FurniList";
import { ExportCsvButton } from "@/components/ExportCsvButton";
import { LiveStatusBar } from "@/components/live/LivePrices";
import { TimeAgo } from "@/components/Freshness";
import { Notice } from "@/components/ui";
import { RANKINGS, type FurniRow, type RankingKind } from "@/lib/data/rankings";
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

/** El valor de la columna principal de cada ranking, para el CSV. */
function metricValue(row: FurniRow, metric: Metric): number | null {
  if (metric === "change") return row.change === null ? null : Math.round(row.change * 1000) / 10;
  if (metric === "pct") return row.pct === undefined ? null : Math.round(row.pct * 1000) / 10;
  return row[metric] ?? null;
}

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
        {rows.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <LiveStatusBar />
            <ExportCsvButton
              hotel={hotel}
              name={`ranking-${kind}-${hotel}`}
              rows={[
                ["#", p.list.colFurni, "classname", p.list.metric[METRIC[kind]], p.list.colMin, p.list.colForSale, p.list.colAvg7],
                ...rows.map((row, i) => [i + 1, row.n, row.k, metricValue(row, METRIC[kind]), row.oo > 0 ? row.cp : null, row.oo, row.a7]),
              ]}
            />
          </div>
        )}
        <FurniTable hotel={hotel} rows={rows} metric={METRIC[kind]} />
      </div>
    </div>
  );
}
