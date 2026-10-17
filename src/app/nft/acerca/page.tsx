import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { TimeAgo } from "@/components/Freshness";
import { NFT_COLLECTIONS } from "@/lib/nft/collections";
import { getNftMeta } from "@/lib/nft/views";
import { defaultHotel } from "@/lib/hotels";
import { formatUsd } from "@/lib/format";

export const metadata: Metadata = { title: "Datos y límites" };

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card space-y-2 p-5">
      <h2 className="font-display text-xl font-bold text-text">{title}</h2>
      <div className="space-y-2 text-text-2 [&_strong]:text-text">{children}</div>
    </section>
  );
}

export default async function NftAcercaPage() {
  const meta = await getNftMeta();
  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="font-display text-3xl font-bold text-text">Sección NFT: de dónde salen los datos</h1>

      <Block title="Qué es esta sección">
        <p>
          Muestra los <strong>coleccionables NFT oficiales de Habbo</strong>, que viven en la blockchain{" "}
          <strong>Immutable zkEVM</strong> y se compran y venden con criptomonedas. Es independiente del{" "}
          <Link href={`/${defaultHotel()}`} className="text-accent hover:underline">
            Marketplace del juego
          </Link>
          , donde los furnis se pagan con créditos. Los precios de una sección no se pueden comparar con los de la otra.
        </p>
      </Block>

      <Block title="Fuentes">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>API pública de Immutable zkEVM</strong> (sin claves ni cuentas): modelos a la venta, precio piso, mejores
            ofertas de compra, última venta y el historial de ventas de cada colección. Respetamos su límite publicado de 5
            pedidos por segundo.
          </li>
          <li>
            <strong>Cotizaciones</strong> ETH, IMX y USDC a dólares: servicio de conversión de Immutable.
            {meta.ethUsd ? ` En el último escaneo, 1 ETH ≈ ${formatUsd(meta.ethUsd)}.` : ""}
          </li>
          <li>
            <strong>Imágenes</strong>: servidas directamente por Habbo desde nft-tokens.habbo.com.
          </li>
        </ul>
        <p className="text-sm">Colecciones incluidas:</p>
        <ul className="list-disc space-y-1 pl-5 font-mono text-xs">
          {NFT_COLLECTIONS.map((c) => (
            <li key={c.slug}>
              {c.official}: {c.address}
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Qué tan actual es cada dato">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Ficha de un NFT:</strong> el precio piso, la mejor oferta y las publicaciones se consultan en vivo desde tu
            navegador.
          </li>
          <li>
            <strong>Rankings y ventas por día:</strong> salen del recolector
            {meta.generatedAt ? (
              <>
                {" "}
                (último escaneo <TimeAgo iso={meta.generatedAt} />)
              </>
            ) : null}
            . Las ventas se guardan desde que empezó a correr; el primer escaneo cargó las de los 14 días anteriores.
          </li>
          <li>
            <strong>Dólares:</strong> las ventas se pagan en ETH (o IMX/USDC) y se pasan a dólares con la cotización del
            momento del escaneo, así que son aproximados.
          </li>
        </ul>
      </Block>

      <Block title="Límites">
        <ul className="list-disc space-y-1 pl-5">
          <li>Solo las colecciones de Immutable zkEVM. Las de la red anterior (Immutable X) ya no están disponibles en su API.</li>
          <li>
            Los avatares NFT de Habbo en Ethereum no se incluyen: sus datos requieren servicios con clave de acceso.
          </li>
          <li>
            Hay publicaciones a precios absurdos que nadie compra: por eso &quot;Más caros&quot; usa ventas reales, no el piso.
          </li>
          <li>Las ventas entre billeteras de la misma persona o con precios raros también cuentan en los promedios.</li>
        </ul>
      </Block>

      <Block title="Aviso">
        <p>
          Esto no es asesoramiento financiero. Los NFT son activos volátiles: su precio puede cambiar mucho o llegar a cero.
          Furnímetro no vende, no compra y no custodia nada; solo muestra datos públicos. No es un sitio oficial de Habbo,
          Sulake, Azerion ni Immutable.
        </p>
      </Block>
    </div>
  );
}
