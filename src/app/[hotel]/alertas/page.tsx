import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertsManager } from "@/components/alerts/AlertsManager";
import { JoinChannels } from "@/components/JoinChannels";
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
          Elegí los furnis que te interesan y te avisamos cuando alguien los publique barato: por debajo de lo que se suele
          pagar, o al precio que vos digas.
        </p>
      </header>
      <Notice>
        <strong className="text-text">Cómo funciona.</strong> Cada pocos minutos miramos el precio más barato publicado de
        cada furni de tu lista. Si cumple tu condición, te avisamos. Si alguien lo publica barato y otro lo compra antes de que
        volvamos a mirar, ese aviso no llega.
      </Notice>
      <JoinChannels
        title="¿Preferís Discord, Telegram o WhatsApp?"
        note="Unite con un toque. Ahí publicamos para todos las ofertas más fuertes de cada escaneo (no tu lista personal)."
      />
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
