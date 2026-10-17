import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertsManager } from "@/components/alerts/AlertsManager";
import { Notice } from "@/components/ui";
import { enabledHotels, isEnabledHotel } from "@/lib/hotels";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/Skeletons";

export const metadata: Metadata = { title: "Alertas de precio" };

async function AlertasPageContent({ params }: Pick<PageProps<"/[hotel]/alertas">, "params">) {
  const { hotel } = await params;
  if (!isEnabledHotel(hotel)) notFound();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-text">Alertas de precio</h1>
        <p className="mt-2 max-w-3xl text-text-2">
          Armá tu lista de furnis y elegí cuándo avisarte: cuando el precio mínimo publicado quede un cierto porcentaje por
          debajo de su promedio reciente, o cuando baje a un precio que vos elijas.
        </p>
      </header>
      <Notice>
        <strong className="text-text">Qué se puede detectar y qué no.</strong> La API de Habbo informa el precio más bajo
        publicado y cuántas ofertas hay en el momento de la consulta, no cada publicación individual ni quién la hizo. La
        alerta compara ese precio mínimo cada pocos minutos: si alguien publica barato y otro lo compra entre dos chequeos, no
        se va a ver. No es un aviso instantáneo.
      </Notice>
      <AlertsManager hotel={hotel} hotels={enabledHotels()} />
    </div>
  );
}

export default function AlertasPage({ params }: PageProps<"/[hotel]/alertas">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AlertasPageContent params={params} />
    </Suspense>
  );
}
