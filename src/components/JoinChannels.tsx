import { communityLinks, type CommunityId } from "@/lib/community";
import { getI18n } from "@/lib/i18n/server";

const STYLE: Record<CommunityId, string> = {
  // Colores de cada servicio; el texto elegido para que se lea bien sobre cada fondo.
  discord: "bg-[#5865F2] text-white hover:brightness-110",
  telegram: "bg-[#229ED9] text-[#04131c] hover:brightness-110",
  whatsapp: "bg-[#25D366] text-[#052e16] hover:brightness-110",
};

function Icon({ id }: { id: CommunityId }) {
  if (id === "telegram") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path fill="currentColor" d="M21.5 3.6 2.9 10.8c-1.2.5-1.2 1.2-.2 1.5l4.8 1.5 1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.6c.3-1.3-.5-1.9-1.4-1.5ZM9 13.4l9.3-5.9c.4-.3.8-.1.5.2l-8 7.2-.3 3.3L9 13.4Z" />
      </svg>
    );
  }
  if (id === "whatsapp") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path fill="currentColor" d="M12 2.2a9.8 9.8 0 0 0-8.4 14.8L2.2 21.8l4.9-1.3A9.8 9.8 0 1 0 12 2.2Zm0 17.8a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 1 1 12 20Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3a2.5 2.5 0 0 0-.8 1.9 4.4 4.4 0 0 0 .9 2.3 10 10 0 0 0 3.8 3.4c1.4.6 2 .7 2.7.6.4-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.5-.3Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="currentColor" d="M19.3 5.3A16.5 16.5 0 0 0 15.2 4l-.5 1a15 15 0 0 0-5.4 0l-.5-1a16.4 16.4 0 0 0-4.1 1.3A17.2 17.2 0 0 0 1.8 17a16.6 16.6 0 0 0 5 2.5l1.1-1.7a10.7 10.7 0 0 1-1.7-.8l.4-.3a11.8 11.8 0 0 0 10.8 0l.4.3c-.5.3-1.1.6-1.7.8l1.1 1.7a16.5 16.5 0 0 0 5-2.5 17.1 17.1 0 0 0-2.9-11.7ZM8.7 14.6c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm6.6 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z" />
    </svg>
  );
}

/**
 * Botones para unirse a los canales donde se publican las ofertas. No muestra
 * nada si no hay ningún canal configurado.
 */
export async function JoinChannels({ title, note }: { title?: string; note?: string }) {
  const links = communityLinks();
  if (links.length === 0) return null;
  const { p } = await getI18n();
  return (
    <section className="card p-4" aria-label={p.channels.aria}>
      <h2 className="font-display text-lg font-bold text-text">{title ?? p.channels.title}</h2>
      <p className="mt-1 text-sm text-text-2">{note ?? p.channels.note}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {links.map((l) => (
          <a
            key={l.id}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold sm:w-auto ${STYLE[l.id]}`}
          >
            <Icon id={l.id} />
            {p.channels[l.id]}
          </a>
        ))}
      </div>
    </section>
  );
}
