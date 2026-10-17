import Link from "next/link";
import { FurniTable, type Metric } from "@/components/FurniList";
import { TimeAgo } from "@/components/Freshness";
import { Notice } from "@/components/ui";
import { RANKINGS, type RankingKind } from "@/lib/data/rankings";
import { getMarketMeta, getRankingView } from "@/lib/data/views";
import type { HotelCode } from "@/lib/hotels";
import { HOTELS } from "@/lib/hotels";

const METRIC: Record<RankingKind, Metric> = {
  vendidos: "s7",
  volumen: "c7",
  subas: "change",
  bajas: "change",
  caros: "ref",
  ofertados: "oo",
};

export async function RankingView({ hotel, kind }: { hotel: HotelCode; kind: RankingKind }) {
  const [rows, meta] = await Promise.all([getRankingView(hotel, kind, 100), getMarketMeta(hotel)]);
  const info = RANKINGS[kind];
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-3xl font-bold text-text">Rankings de {HOTELS[hotel].label}</h1>
        <p className="mt-1 text-text-2">
          {meta.generatedAt ? (
            <>
              Calculados con el último escaneo (<TimeAgo iso={meta.generatedAt} />
              ). Cada furni muestra el dato de su propio último escaneo.
            </>
          ) : (
            "Todavía no hay escaneos guardados."
          )}
        </p>
      </header>
      <nav aria-label="Tipo de ranking" className="flex flex-wrap gap-2">
        {(Object.keys(RANKINGS) as RankingKind[]).map((k) => (
          <Link
            key={k}
            href={`/${hotel}/rankings/${k}`}
            aria-current={k === kind ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              k === kind ? "border-accent bg-accent/15 text-text" : "border-line text-text-2 hover:bg-surface"
            }`}
          >
            {RANKINGS[k].title}
          </Link>
        ))}
      </nav>
      <div>
        <h2 className="font-display text-xl font-bold text-text">{info.title}</h2>
        <p className="mb-3 text-sm text-text-2">{info.hint}</p>
        {!meta.hasData ? <Notice tone="warn">Este hotel todavía no tiene datos del recolector.</Notice> : null}
        <FurniTable hotel={hotel} rows={rows} metric={METRIC[kind]} />
      </div>
    </div>
  );
}
