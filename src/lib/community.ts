/**
 * Canales públicos donde se publican las ofertas detectadas. Los enlaces se
 * configuran con variables NEXT_PUBLIC_* (son públicos: son las invitaciones).
 */
export type CommunityId = "discord" | "telegram" | "whatsapp";

export interface CommunityLink {
  id: CommunityId;
  label: string;
  href: string;
}

const RULES: Record<CommunityId, { label: string; hosts: string[]; path: RegExp }> = {
  discord: { label: "Unite al Discord", hosts: ["discord.gg", "discord.com", "www.discord.com"], path: /^\/(invite\/)?[\w-]{2,40}\/?$/ },
  telegram: { label: "Unite al canal de Telegram", hosts: ["t.me", "telegram.me"], path: /^\/[\w+]{3,64}\/?$/ },
  whatsapp: {
    label: "Seguí el canal de WhatsApp",
    hosts: ["whatsapp.com", "www.whatsapp.com", "chat.whatsapp.com"],
    path: /^\/(channel\/)?[\w-]{8,64}\/?$/,
  },
};

/** Devuelve el enlace solo si es https y apunta al servicio que corresponde. */
export function safeCommunityUrl(id: CommunityId, raw: string | undefined | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    const rule = RULES[id];
    if (url.protocol !== "https:" || !rule.hosts.includes(url.hostname) || !rule.path.test(url.pathname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function communityLinks(
  env: Partial<Record<"discord" | "telegram" | "whatsapp", string | undefined>> = {
    discord: process.env.NEXT_PUBLIC_DISCORD_URL,
    telegram: process.env.NEXT_PUBLIC_TELEGRAM_URL,
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_URL,
  },
): CommunityLink[] {
  const out: CommunityLink[] = [];
  for (const id of ["discord", "telegram", "whatsapp"] as const) {
    const href = safeCommunityUrl(id, env[id]);
    if (href) out.push({ id, label: RULES[id].label, href });
  }
  return out;
}

/**
 * Red social de la comunidad (perfil público de Bomhams en X). Se puede cambiar
 * con NEXT_PUBLIC_X_URL; solo se aceptan perfiles de x.com o twitter.com.
 */
export const DEFAULT_X_URL = "https://x.com/bomhams";

export function safeXUrl(raw: string | undefined | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:" || !["x.com", "www.x.com", "twitter.com", "www.twitter.com"].includes(url.hostname)) return null;
    if (!/^\/[A-Za-z0-9_]{1,15}\/?$/.test(url.pathname)) return null;
    return `https://x.com${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return null;
  }
}

export function communityX(raw: string | undefined = process.env.NEXT_PUBLIC_X_URL): string {
  return safeXUrl(raw) ?? DEFAULT_X_URL;
}
