import { describe, expect, it, vi } from "vitest";
import { chunkText, configuredChannels, discordChannel, isDiscordWebhook, telegramChannel, type Channel } from "@/lib/alerts/notifiers";
import { evaluateRule, parseRule, parseRules, shouldNotify, type WatchRule } from "@/lib/alerts/rules";
import { dealsThreshold, rulesFromEnv, runServerAlerts, sendTestMessage } from "@/lib/alerts/server";
import { normalizeItem } from "@/lib/habbo/api";
import { summarize } from "@/lib/market/stats";
import type { MarketSummary } from "@/lib/market/summary";
import { keys } from "@/lib/storage";
import { day, MemoryStorage, rawItem } from "../helpers";

const rule = (extra: Partial<WatchRule> = {}): WatchRule => ({
  id: "r1",
  hotel: "es",
  item: "throne",
  mode: "below_avg",
  value: 20,
  ...extra,
});

describe("evaluateRule", () => {
  it("porcentaje bajo el promedio", () => {
    expect(evaluateRule(rule(), { cp: 80, oo: 2, ref: 100 }).triggered).toBe(true);
    expect(evaluateRule(rule(), { cp: 81, oo: 2, ref: 100 }).triggered).toBe(false);
    expect(evaluateRule(rule(), { cp: 10, oo: 2, ref: null }).triggered).toBe(false);
    expect(evaluateRule(rule(), { cp: 10, oo: 2, ref: 100 }).belowRef).toBeCloseTo(0.9);
  });

  it("precio fijo y sin ofertas", () => {
    const r = rule({ mode: "below_price", value: 50 });
    expect(evaluateRule(r, { cp: 50, oo: 1, ref: null }).triggered).toBe(true);
    expect(evaluateRule(r, { cp: 0, oo: 0, ref: 100 }).triggered).toBe(false);
  });
});

describe("shouldNotify", () => {
  const triggered = (price: number) => evaluateRule(rule({ mode: "below_price", value: 100 }), { cp: price, oo: 1, ref: null });
  it("avisa al empezar a cumplirse, no repite, y vuelve a avisar si baja más", () => {
    const a = shouldNotify(triggered(90), undefined, 1);
    expect(a.notify).toBe(true);
    const b = shouldNotify(triggered(90), a.next, 2);
    expect(b.notify).toBe(false);
    const c = shouldNotify(triggered(80), b.next, 3);
    expect(c.notify).toBe(true);
    const off = shouldNotify(triggered(150), c.next, 4);
    expect(off.notify).toBe(false);
    expect(off.next.active).toBe(false);
    expect(shouldNotify(triggered(95), off.next, 5).notify).toBe(true);
  });
});

describe("parseRule", () => {
  it("valida lo que viene de afuera", () => {
    expect(parseRule({ hotel: "es", item: "throne", mode: "below_avg", value: "25" })?.value).toBe(25);
    expect(parseRule({ hotel: "xx", item: "throne", mode: "below_avg", value: 25 })).toBeNull();
    expect(parseRule({ hotel: "es", item: "", mode: "below_avg", value: 25 })).toBeNull();
    expect(parseRule({ hotel: "es", item: "a", mode: "below_avg", value: 150 })).toBeNull();
    expect(parseRule({ hotel: "es", item: "a", mode: "otro", value: 5 })).toBeNull();
    expect(parseRule({ hotel: "es", item: "__proto__", mode: "below_avg", value: 5 })).toBeNull();
    expect(parseRule({ hotel: "es", item: "<img src=x>", mode: "below_avg", value: 5 })).toBeNull();
    expect(parseRules([rule(), rule(), "basura"])).toHaveLength(1);
  });

  it("lee las reglas del entorno y tolera JSON roto", () => {
    expect(rulesFromEnv({ ALERTS_RULES: JSON.stringify([rule()]) } as never)).toHaveLength(1);
    expect(rulesFromEnv({ ALERTS_RULES: "{no es json" } as never)).toEqual([]);
  });
});

describe("notificadores", () => {
  it("parte mensajes largos por líneas", () => {
    const text = Array.from({ length: 50 }, (_, i) => `línea ${i} ${"x".repeat(50)}`).join("\n");
    const chunks = chunkText(text, 500);
    expect(chunks.every((c) => c.length <= 500)).toBe(true);
    expect(chunks.join("\n")).toBe(text);
  });

  it("solo acepta webhooks de Discord", () => {
    expect(isDiscordWebhook("https://discord.com/api/webhooks/1/abc")).toBe(true);
    expect(isDiscordWebhook("https://evil.example/api/webhooks/1")).toBe(false);
    expect(() => discordChannel("http://discord.com/api/webhooks/1/a")).toThrow();
  });

  it("Discord: manda el texto sin menciones", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));
    await discordChannel("https://discord.com/api/webhooks/1/abc", fetchImpl).send("hola @everyone");
    const body = JSON.parse(String((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body).toEqual({ content: "hola @everyone", allowed_mentions: { parse: [] } });
  });

  it("Telegram: valida token y chat, y usa sendMessage", async () => {
    expect(() => telegramChannel("malo", "1")).toThrow();
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    await telegramChannel("123456:ABCDEFGHIJKLMNOPQRSTUVWXYZ", "-100123", fetchImpl).send("hola");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.telegram.org/bot123456:ABCDEFGHIJKLMNOPQRSTUVWXYZ/sendMessage");
    expect(JSON.parse(String(init.body)).chat_id).toBe("-100123");
  });

  it("Discord: los enlaces van sin vista previa", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));
    await discordChannel("https://discord.com/api/webhooks/1/abc", fetchImpl).send("Mirá https://x.vercel.app/es/furni/throne");
    const body = JSON.parse(String((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.content).toBe("Mirá <https://x.vercel.app/es/furni/throne>");
  });

  it("umbral de ofertas: 30 % por defecto, 0 lo apaga", () => {
    expect(dealsThreshold({} as never)).toBe(30);
    expect(dealsThreshold({ ALERTS_DEALS_MIN_DISCOUNT: "45" } as never)).toBe(45);
    expect(dealsThreshold({ ALERTS_DEALS_MIN_DISCOUNT: "0" } as never)).toBe(0);
    expect(dealsThreshold({ ALERTS_DEALS_MIN_DISCOUNT: "abc" } as never)).toBe(0);
  });

  it("mensaje de prueba a todos los canales", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    const res = await sendTestMessage(
      { DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/1/abc", TELEGRAM_BOT_TOKEN: "123456:ABCDEFGHIJKLMNOPQRSTUVWXYZ", TELEGRAM_CHAT_ID: "@furnimetro" } as never,
      fetchImpl,
    );
    expect(res).toEqual({ channels: ["discord", "telegram"], errors: [] });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("activa canales solo si hay configuración", () => {
    expect(configuredChannels({} as never)).toEqual([]);
    expect(
      configuredChannels({
        DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/1/abc",
        TELEGRAM_BOT_TOKEN: "123456:ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        TELEGRAM_CHAT_ID: "42",
      } as never).map((c) => c.name),
    ).toEqual(["discord", "telegram"]);
  });
});

describe("runServerAlerts", () => {
  function summaryWith(price: number): MarketSummary {
    const s = summarize(normalizeItem(rawItem("throne", { currentPrice: price, currentOpenOffers: 3, history: [day(-2, 1000, 10)] }), "r")!);
    return {
      v: 1,
      hotel: "es",
      generatedAt: "2026-10-17T00:00:00Z",
      statsDate: "2026-10-17",
      scan: {} as never,
      coverage: {} as never,
      items: { throne: s },
    };
  }

  function sink() {
    const sent: string[] = [];
    const channel: Channel = { name: "discord", send: async (t) => void sent.push(t) };
    return { sent, channel };
  }

  const env = {
    ALERTS_RULES: JSON.stringify([rule()]),
    SITE_URL: "https://ejemplo.vercel.app",
    ALERTS_DEALS_MIN_DISCOUNT: "0",
  } as never;

  it("avisa una vez, no repite y vuelve a avisar si baja más", async () => {
    const storage = new MemoryStorage();
    const { sent, channel } = sink();
    const run = (price: number) => runServerAlerts({ hotel: "es", summary: summaryWith(price), storage, env, channels: [channel], now: () => 1 });

    const first = await run(700);
    expect(first.sent).toBe(1);
    expect(sent[0]).toContain("700 créditos");
    expect(sent[0]).toContain("https://ejemplo.vercel.app/es/furni/throne");

    const writesBefore = storage.writes.length;
    expect((await run(700)).sent).toBe(0);
    expect(storage.writes.length).toBe(writesBefore); // sin cambios, no se escribe

    expect((await run(600)).sent).toBe(1);
    expect(storage.writes.at(-1)).toBe(keys.alertState());
  });

  it("no hace nada si no hay canales configurados", async () => {
    const storage = new MemoryStorage();
    const res = await runServerAlerts({ hotel: "es", summary: summaryWith(1), storage, env, channels: [] });
    expect(res.sent).toBe(0);
    expect(storage.writes).toEqual([]);
  });

  it("avisa de ofertas generales si está activado", async () => {
    const storage = new MemoryStorage();
    const { sent, channel } = sink();
    const res = await runServerAlerts({
      hotel: "es",
      summary: summaryWith(500),
      storage,
      env: { ALERTS_DEALS_MIN_DISCOUNT: "40" } as never,
      channels: [channel],
    });
    expect(res.sent).toBe(1);
    expect(sent[0]).toContain("50 % menos que lo que se pagó esta semana");
  });
});
