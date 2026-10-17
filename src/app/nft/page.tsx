import Link from "next/link";
import { TimeAgo } from "@/components/Freshness";
import { NftImage } from "@/components/nft/NftImage";
import { NftMiniList } from "@/components/nft/NftList";
import { SearchBox } from "@/components/SearchBox";
import { Notice, SectionTitle, StatTile } from "@/components/ui";
import { formatCompact, formatInt, formatUsd } from "@/lib/format";
import { getNftHome } from "@/lib/nft/views";

export default async function NftHome() {
  const view = await getNftHome();
  return (
    <div className="space-y-10">
      <section className="nft-grid -mx-4 px-4 py-8 md:mx-0 md:rounded-2xl md:border md:border-[#a78bfa]/30 md:px-8">
        <p className="text-sm font-medium text-accent">NFT · blockchain Immutable zkEVM</p>
        <h1 className="mt-2 max-w-2xl font-display text-3xl font-bold text-text md:text-4xl">
          Precios y ventas de los NFT oficiales de Habbo
        </h1>
        <p className="mt-3 max-w-2xl text-text-2">
          Furnis, ropa, mascotas, tokens y add-ons coleccionables: precio piso (la publicación más barata), mejor oferta de
          compra, ventas de la semana y evolución del precio, en dólares.
        </p>
        <div className="mt-6 max-w-2xl">
          <SearchBox nft size="lg" />
        </div>
        <p className="mt-4 text-sm text-text-2">
          {view.meta.generatedAt ? (
            <>
              Último escaneo <TimeAgo iso={view.meta.generatedAt} />. Cotización usada: 1 ETH ≈ {formatUsd(view.meta.ethUsd)}.
              La ficha de cada NFT se consulta en vivo.{" "}
              <Link href="/nft/acerca" className="text-accent hover:underline">
                ¿De dónde salen los datos?
              </Link>
            </>
          ) : (
            "Todavía no hay escaneos guardados de la sección NFT."
          )}
        </p>
      </section>

      {!view.meta.hasData && <Notice tone="warn">La sección NFT todavía no tiene datos del recolector.</Notice>}

      {view.totals && (
        <section aria-label="Resumen NFT" className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Modelos a la venta" value={formatCompact(view.totals.listed)} />
          <StatTile label="Ventas" value={formatCompact(view.totals.sales7)} sub="últimos 7 días" />
          <StatTile label="Dólares movidos" value={formatUsd(view.totals.volume7, true)} sub="últimos 7 días" />
          <StatTile label="Modelos con datos" value={formatCompact(view.totals.models)} sub="a la venta o vendidos en 30 días" />
        </section>
      )}

      <section aria-label="Colecciones">
        <SectionTitle title="Colecciones" hint="Las 5 colecciones oficiales de Habbo en Immutable" />
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {view.collections.map((c) => (
            <li key={c.slug}>
              <Link href={`/nft/coleccion/${c.slug}`} className="card flex h-full flex-col gap-2 p-4 hover:bg-surface-2">
                <span className="flex items-center gap-3">
                  <NftImage src={c.img} size={40} />
                  <span className="font-display font-bold text-text">{c.name}</span>
                </span>
                <span className="text-sm text-text-2">
                  {formatInt(c.listed)} a la venta · desde {formatUsd(c.floorUsd)}
                </span>
                <span className="text-xs text-muted">
                  {formatInt(c.sales7)} ventas · {formatUsd(c.volume7, true)} en 7 días
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {view.meta.hasData && (
        <div className="grid gap-6 md:grid-cols-2">
          <section className="card p-4">
            <SectionTitle title="Más vendidos" hint="Unidades en los últimos 7 días" href="/nft/rankings/vendidos" />
            <NftMiniList rows={view.vendidos} metric="s7" empty="Sin ventas registradas todavía." />
          </section>
          <section className="card p-4">
            <SectionTitle title="Ofertas" hint="Piso muy por debajo del promedio semanal" href="/nft/rankings/ofertas" />
            <NftMiniList rows={view.ofertas} metric="discount" empty="Ninguna oferta fuerte en el último escaneo." />
          </section>
          <section className="card p-4">
            <SectionTitle title="Mayores subas" hint="Promedio de 7 días vs. semana anterior" href="/nft/rankings/subas" />
            <NftMiniList rows={view.subas} metric="change" empty="Hace falta una semana más de datos." />
          </section>
          <section className="card p-4">
            <SectionTitle title="Mayores bajas" hint="Promedio de 7 días vs. semana anterior" href="/nft/rankings/bajas" />
            <NftMiniList rows={view.bajas} metric="change" empty="Hace falta una semana más de datos." />
          </section>
        </div>
      )}
    </div>
  );
}
