import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ServerExport } from "@/components/alerts/ServerExport";
import { PageSkeleton } from "@/components/Skeletons";
import { isEnabledHotel } from "@/lib/hotels";

/**
 * Página para quien administra el sitio (no tiene enlaces desde la web; está en el
 * README). Los visitantes usan los avisos del navegador.
 */
export const metadata: Metadata = {
  title: "Avisos por Discord o Telegram",
  robots: { index: false, follow: false },
};

async function Content({ params }: Pick<PageProps<"/[hotel]/alertas/servidor">, "params">) {
  const { hotel } = await params;
  if (!isEnabledHotel(hotel)) notFound();
  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-text">Avisos por Discord o Telegram</h1>
        <p className="mt-2 text-text-2">
          Solo para quien administra el sitio: hace que el servidor te avise aunque no tengas ninguna pestaña abierta.
        </p>
      </header>
      <ol className="list-decimal space-y-2 pl-5 text-text-2 [&_code]:text-text">
        <li>
          Armá tu lista en{" "}
          <Link href={`/${hotel}/alertas`} className="text-accent hover:underline">
            Alertas
          </Link>{" "}
          y tocá <strong className="text-text">Copiar mi lista</strong> acá abajo.
        </li>
        <li>
          En Vercel, abrí el proyecto → <strong className="text-text">Settings → Environment Variables</strong> y creá{" "}
          <code>ALERTS_RULES</code> pegando la lista.
        </li>
        <li>
          Agregá un canal: <code>DISCORD_WEBHOOK_URL</code> (en Discord: Editar canal → Integraciones → Webhooks), o{" "}
          <code>TELEGRAM_BOT_TOKEN</code> y <code>TELEGRAM_CHAT_ID</code> (bot creado con @BotFather).
        </li>
        <li>Volvé a desplegar. Los avisos salen cada vez que corre el recolector.</li>
      </ol>
      <ServerExport />
    </div>
  );
}

export default function ServidorPage({ params }: PageProps<"/[hotel]/alertas/servidor">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}
