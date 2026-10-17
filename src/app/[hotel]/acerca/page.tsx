import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { TimeAgo } from "@/components/Freshness";
import { getMarketMeta } from "@/lib/data/views";
import { formatInt } from "@/lib/format";
import { HOTELS, isEnabledHotel } from "@/lib/hotels";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/Skeletons";

export const metadata: Metadata = { title: "Datos y límites" };

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card space-y-2 p-5">
      <h2 className="font-display text-xl font-bold text-text">{title}</h2>
      <div className="space-y-2 text-text-2 [&_strong]:text-text">{children}</div>
    </section>
  );
}

async function AcercaPageContent({ params }: Pick<PageProps<"/[hotel]/acerca">, "params">) {
  const { hotel } = await params;
  if (!isEnabledHotel(hotel)) notFound();
  const meta = await getMarketMeta(hotel);
  const cov = meta.scan ? meta : null;
  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="font-display text-3xl font-bold text-text">Qué datos son reales y cuáles son sus límites</h1>

      <Block title="De dónde salen los datos">
        <p>
          Todo sale de la <strong>API pública y documentada de Habbo</strong> (endpoint de estadísticas del Marketplace,
          documentado en su Swagger oficial) y del <strong>furnidata</strong> público de cada hotel, que trae los nombres y la
          lista de furnis intercambiables. No se usan cuentas, contraseñas ni datos de usuarios, y no se lee la web del juego.
        </p>
        <p>
          Los íconos de los furnis se muestran directo desde el servidor de imágenes de Habbo; este sitio no los copia ni los
          aloja.
        </p>
      </Block>

      <Block title="Qué tan actual es cada dato">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Ficha de un furni:</strong> tu navegador consulta la API en el momento (precio mínimo publicado, ofertas
            abiertas y los últimos 30 días de ventas). Se reutiliza la respuesta durante 1 minuto.
          </li>
          <li>
            <strong>Historial por día:</strong> Habbo lo da agrupado por día y hasta el día anterior; el día de hoy todavía no
            aparece.
          </li>
          <li>
            <strong>Rankings y ofertas detectadas:</strong> salen del recolector, que consulta el catálogo de a partes. Cada
            furni muestra el dato de su último escaneo; los más activos se actualizan más seguido.
          </li>
          <li>
            <strong>Historial de más de 30 días y del precio mínimo publicado:</strong> lo va guardando este sitio desde que
            empezó a recolectar; antes de esa fecha no hay datos.
          </li>
        </ul>
        {cov?.scan && (
          <p className="text-sm">
            Hotel {HOTELS[hotel].label}: última corrida <TimeAgo iso={meta.generatedAt} />, con{" "}
            {formatInt(cov.scan.scanned)} furnis consultados en {formatInt(cov.scan.requests)} pedidos. Catálogo:{" "}
            {formatInt(meta.catalogSize)} furnis intercambiables.
          </p>
        )}
      </Block>

      <Block title="Límites que conviene saber">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>No es tiempo real de cada publicación.</strong> La API informa el precio más bajo publicado y cuántas
            ofertas hay en el momento de la consulta. No muestra cada oferta, ni quién la publicó, ni a qué hora.
          </li>
          <li>
            <strong>La API limita los pedidos</strong> (medimos unos 15 a 20 por minuto por conexión, con hasta 25 + 25 furnis
            por pedido). Por eso el recolector va despacio y recorre el catálogo de a partes.
          </li>
          <li>
            <strong>Promedios:</strong> el promedio de 7 días es ponderado por unidades vendidas. Con pocas ventas, un solo
            precio raro lo puede mover mucho; las subas y bajas piden al menos 5 ventas por semana.
          </li>
          <li>
            Cada hotel tiene su propia economía: los precios de {HOTELS[hotel].label} no se comparan con los de otros hoteles.
          </li>
          <li>Los datos pueden tener errores o demoras. No los uses como única referencia para comprar o vender.</li>
        </ul>
      </Block>

      <Block title="Privacidad">
        <p>
          Tu lista de alertas y las ofertas detectadas se guardan solo en tu navegador. El sitio no usa cuentas ni cookies de
          seguimiento. Las consultas en vivo van desde tu navegador directo a la API de Habbo, sin enviar cookies.
        </p>
      </Block>

      <Block title="Aviso legal">
        <p>
          Furnímetro es un sitio de fans, gratuito y sin fines comerciales. No es oficial y no está afiliado, patrocinado ni
          aprobado por Sulake Oy ni por Azerion. Habbo y los nombres e imágenes de los furnis son propiedad de Sulake Oy. Si
          Sulake pide retirar algún contenido, se retira.
        </p>
      </Block>
    </div>
  );
}

export default function AcercaPage({ params }: PageProps<"/[hotel]/acerca">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AcercaPageContent params={params} />
    </Suspense>
  );
}
