import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DetectionsList } from "@/components/alerts/DetectionsList";
import { DealsTable } from "@/components/deals/DealsTable";
import { TimeAgo } from "@/components/Freshness";
import { Notice } from "@/components/ui";
import { DEFAULT_DEAL_OPTIONS } from "@/lib/market/deals";
import { getDealsView, getMarketMeta } from "@/lib/data/views";
import { HOTELS, isEnabledHotel } from "@/lib/hotels";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/Skeletons";

export const metadata: Metadata = { title: "Ofertas detectadas" };

async function OfertasPageContent({ params }: Pick<PageProps<"/[hotel]/ofertas">, "params">) {
  const { hotel } = await params;
  if (!isEnabledHotel(hotel)) notFound();
  const [rows, meta] = await Promise.all([getDealsView(hotel, "pct", 100), getMarketMeta(hotel)]);
  const o = DEFAULT_DEAL_OPTIONS;
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold text-text">Ofertas detectadas en {HOTELS[hotel].label}</h1>
        <p className="mt-2 max-w-3xl text-text-2">
          Furnis cuyo precio mínimo publicado estaba al menos un {Math.round(o.minDiscount * 100)} % por debajo de lo que se
          pagó en la última semana. Solo cuentan furnis con ventas recientes ({o.minSold7} o más en 7 días y {o.minSold30} o
          más en 30), de {o.minRef} créditos o más, y sin exceso de ofertas (si hay más publicados que ventas, el precio
          bajo no es una ganga: es que nadie compra).
          {meta.generatedAt && (
            <>
              {" "}
              Último escaneo: <TimeAgo iso={meta.generatedAt} />.
            </>
          )}
        </p>
      </header>

      <Notice>
        La API de Habbo informa el precio mínimo y la cantidad de ofertas en el momento de la consulta, no cada publicación por
        separado. Una oferta de esta lista puede haberse vendido después del escaneo: usá <strong>Verificar en vivo</strong>{" "}
        antes de entrar al juego.
      </Notice>

      <section>
        <DealsTable hotel={hotel} rows={rows} />
      </section>

      <section className="card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-text">Detectadas para tu lista</h2>
          <Link href={`/${hotel}/alertas`} className="text-sm text-accent hover:underline">
            Configurar alertas
          </Link>
        </div>
        <DetectionsList />
      </section>
    </div>
  );
}

export default function OfertasPage({ params }: PageProps<"/[hotel]/ofertas">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OfertasPageContent params={params} />
    </Suspense>
  );
}
