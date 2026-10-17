import Link from "next/link";
import { notFound } from "next/navigation";
import { TimeAgo } from "@/components/Freshness";
import { FurniMiniList } from "@/components/FurniList";
import { SearchBox } from "@/components/SearchBox";
import { CoinGlyph, Notice, SectionTitle, StatTile } from "@/components/ui";
import { getHomeView } from "@/lib/data/views";
import { formatCompact, formatInt } from "@/lib/format";
import { HOTELS, isEnabledHotel } from "@/lib/hotels";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/Skeletons";

async function HotelHomeContent({ params }: Pick<PageProps<"/[hotel]">, "params">) {
  const { hotel } = await params;
  if (!isEnabledHotel(hotel)) notFound();
  const view = await getHomeView(hotel);
  const h = HOTELS[hotel];

  return (
    <div className="space-y-10">
      <section className="iso-floor -mx-4 rounded-none px-4 py-8 md:mx-0 md:rounded-2xl md:border md:border-line md:px-8">
        <p className="text-sm font-medium text-accent">Marketplace · hotel {h.label} ({h.region})</p>
        <h1 className="mt-2 max-w-2xl font-display text-3xl font-bold text-text md:text-4xl">
          Precios de furnis, ofertas y tendencias del Marketplace
        </h1>
        <p className="mt-3 max-w-2xl text-text-2">
          Buscá cualquier furni intercambiable para ver su precio mínimo publicado, cuántos hay en venta, su promedio y la
          evolución de su precio.
        </p>
        <div className="mt-6 max-w-2xl">
          <SearchBox hotel={hotel} size="lg" />
        </div>
        <p className="mt-4 text-sm text-text-2">
          {view.meta.generatedAt ? (
            <>
              Rankings: último escaneo <TimeAgo iso={view.meta.generatedAt} />
              {view.meta.scan?.selected ? ` (${formatInt(view.meta.scan.scanned)} furnis consultados)` : ""}. Ficha de cada
              furni: consulta en vivo a la API de Habbo.{" "}
              <Link href={`/${hotel}/acerca`} className="text-accent hover:underline">
                ¿Qué tan actuales son los datos?
              </Link>
            </>
          ) : (
            "Todavía no hay escaneos guardados para este hotel."
          )}
        </p>
      </section>

      {!view.meta.hasData && (
        <Notice tone="warn">
          Este hotel todavía no tiene datos del recolector, así que no hay rankings. La búsqueda y la ficha de cada furni
          funcionan igual, con datos en vivo, una vez que se descargue el catálogo.
        </Notice>
      )}

      {view.totals && (
        <section aria-label="Resumen del mercado" className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Furnis con actividad" value={formatCompact(view.totals.active)} sub="ventas en 30 días u ofertas" />
          <StatTile label="Con ofertas abiertas" value={formatCompact(view.totals.withOffers)} />
          <StatTile label="Unidades vendidas" value={formatCompact(view.totals.sold7)} sub="últimos 7 días" />
          <StatTile
            label="Créditos movidos"
            value={
              <span className="inline-flex items-center gap-1.5">
                {formatCompact(view.totals.credits7)}
                <CoinGlyph className="h-5 w-5" />
              </span>
            }
            sub="últimos 7 días"
          />
        </section>
      )}

      {view.meta.hasData && (
        <div className="grid gap-6 md:grid-cols-2">
          <section className="card p-4">
            <SectionTitle title="Más vendidos" hint="Unidades en los últimos 7 días" href={`/${hotel}/rankings/vendidos`} />
            <FurniMiniList hotel={hotel} rows={view.vendidos} metric="s7" empty="Sin ventas registradas todavía." />
          </section>
          <section className="card p-4">
            <SectionTitle
              title="Ofertas detectadas"
              hint="Precio mínimo muy por debajo del promedio"
              href={`/${hotel}/ofertas`}
              linkLabel="Ver ofertas"
            />
            <FurniMiniList hotel={hotel} rows={view.ofertas} metric="pct" empty="Ninguna oferta fuerte en el último escaneo." />
          </section>
          <section className="card p-4">
            <SectionTitle title="Mayores subas" hint="Promedio de 7 días vs. semana anterior" href={`/${hotel}/rankings/subas`} />
            <FurniMiniList hotel={hotel} rows={view.subas} metric="change" empty="Sin subas con volumen suficiente." />
          </section>
          <section className="card p-4">
            <SectionTitle title="Mayores bajas" hint="Promedio de 7 días vs. semana anterior" href={`/${hotel}/rankings/bajas`} />
            <FurniMiniList hotel={hotel} rows={view.bajas} metric="change" empty="Sin bajas con volumen suficiente." />
          </section>
        </div>
      )}
    </div>
  );
}

export default function HotelHome({ params }: PageProps<"/[hotel]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <HotelHomeContent params={params} />
    </Suspense>
  );
}
