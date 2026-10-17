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
          Solo para quien administra el sitio. Los visitantes ven los botones para unirse; acá se configura qué se publica.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-bold text-text">1. Canales públicos de ofertas</h2>
        <p className="text-sm text-text-2">
          Después de cada escaneo, el sitio publica las ofertas más fuertes (30 % o más por debajo de lo que se pagó esa
          semana, hasta 10 por vez). En el sitio aparece un botón por cada canal que configures.
        </p>
        <ul className="list-disc space-y-2 pl-5 text-sm text-text-2 [&_code]:text-text">
          <li>
            <strong className="text-text">Telegram:</strong> creá un canal público, creá un bot con @BotFather y agregalo al
            canal como administrador con permiso para publicar. Variables: <code>TELEGRAM_BOT_TOKEN</code>,{" "}
            <code>TELEGRAM_CHAT_ID</code> (por ejemplo <code>@FurnimetroOfertas</code>) y{" "}
            <code>NEXT_PUBLIC_TELEGRAM_URL</code> (<code>https://t.me/FurnimetroOfertas</code>).
          </li>
          <li>
            <strong className="text-text">Discord:</strong> en tu servidor, en el canal de ofertas: Editar canal →
            Integraciones → Webhooks → copiar URL (<code>DISCORD_WEBHOOK_URL</code>). Creá una invitación que no venza
            (<code>NEXT_PUBLIC_DISCORD_URL</code>).
          </li>
          <li>
            <strong className="text-text">WhatsApp:</strong> creá un canal desde la app (Novedades → Canales) y copiá su enlace
            (<code>NEXT_PUBLIC_WHATSAPP_URL</code>). WhatsApp no permite publicar en canales de forma automática y legítima,
            así que ahí se publica a mano (por ejemplo, reenviando lo que sale en Telegram).
          </li>
          <li>Volvé a desplegar para que aparezcan los botones.</li>
          <li>
            Para probar: abrí <code>/api/cron/alerts?prueba=1</code> con el encabezado{" "}
            <code>Authorization: Bearer CRON_SECRET</code>; llega un mensaje a cada canal.
          </li>
        </ul>
      </section>

      <h2 className="font-display text-xl font-bold text-text">2. Tu lista personal (opcional)</h2>
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
        <li>Volvé a desplegar. Los avisos salen en los mismos canales cada vez que corre el recolector.</li>
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
