/**
 * Canales de aviso del lado del servidor. Ninguno pide contraseñas:
 * - Discord: una URL de webhook del canal (Ajustes del canal → Integraciones → Webhooks).
 * - Telegram: el token de un bot propio (creado con @BotFather) y el chat_id donde avisar.
 * Se activan solo si están las variables de entorno correspondientes.
 */

export interface Channel {
  name: "discord" | "telegram";
  send(text: string): Promise<void>;
}

const DISCORD_LIMIT = 2000;
const TELEGRAM_LIMIT = 4096;

/** Parte un texto en mensajes que entren en el límite del canal, cortando por líneas. */
export function chunkText(text: string, limit: number): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const line of text.split("\n")) {
    const piece = line.length > limit ? `${line.slice(0, limit - 1)}…` : line;
    if (current && current.length + 1 + piece.length > limit) {
      chunks.push(current);
      current = piece;
    } else {
      current = current ? `${current}\n${piece}` : piece;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function isDiscordWebhook(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      ["discord.com", "discordapp.com", "canary.discord.com", "ptb.discord.com"].includes(u.hostname) &&
      u.pathname.startsWith("/api/webhooks/")
    );
  } catch {
    return false;
  }
}

export function discordChannel(webhookUrl: string, fetchImpl: typeof fetch = fetch): Channel {
  if (!isDiscordWebhook(webhookUrl)) throw new Error("DISCORD_WEBHOOK_URL no parece un webhook de Discord");
  return {
    name: "discord",
    async send(text) {
      for (const content of chunkText(text, DISCORD_LIMIT)) {
        const res = await fetchImpl(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) throw new Error(`Discord respondió ${res.status}`);
      }
    },
  };
}

export function telegramChannel(token: string, chatId: string, fetchImpl: typeof fetch = fetch): Channel {
  if (!/^\d+:[\w-]{20,}$/.test(token)) throw new Error("TELEGRAM_BOT_TOKEN con formato inválido");
  if (!/^-?\d+$|^@\w+$/.test(chatId)) throw new Error("TELEGRAM_CHAT_ID con formato inválido");
  return {
    name: "telegram",
    async send(text) {
      for (const chunk of chunkText(text, TELEGRAM_LIMIT)) {
        const res = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: chunk, disable_web_page_preview: true }),
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) throw new Error(`Telegram respondió ${res.status}`);
      }
    },
  };
}

export function configuredChannels(env: NodeJS.ProcessEnv = process.env, fetchImpl: typeof fetch = fetch): Channel[] {
  const channels: Channel[] = [];
  if (env.DISCORD_WEBHOOK_URL) channels.push(discordChannel(env.DISCORD_WEBHOOK_URL, fetchImpl));
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    channels.push(telegramChannel(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, fetchImpl));
  }
  return channels;
}
