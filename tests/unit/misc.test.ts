import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { furniIconUrl } from "@/lib/habbo/images";
import { formatPct, formatPrice, relativeTime } from "@/lib/format";
import { parseHotelList } from "@/lib/hotels";
import { matchScore, normalize, rankMatches } from "@/lib/search";
import { isAuthorizedCron } from "@/lib/server/cron-auth";
import { FsStorage } from "@/lib/storage/fs";

describe("búsqueda", () => {
  it("ignora acentos y mayúsculas", () => {
    expect(normalize("Dragón  de FUEGO")).toBe("dragon de fuego");
  });

  it("ordena exacto > empieza con > contiene, y desempata por actividad", () => {
    const items = [
      { k: "a", n: "Sillón trono" },
      { k: "throne", n: "Trono" },
      { k: "b", n: "Trono dorado" },
      { k: "c", n: "Trono azul" },
    ];
    const activity: Record<string, number> = { b: 1, c: 5 };
    expect(rankMatches(items, "trono", (i) => activity[i.k] ?? 0, 10).map((i) => i.k)).toEqual(["throne", "c", "b", "a"]);
    expect(matchScore({ k: "throne", n: "Trono" }, "throne")).toBe(100);
    expect(matchScore({ k: "x", n: "Lámpara" }, "zz")).toBe(0);
  });
});

describe("imágenes", () => {
  it("arma la URL del ícono con las variantes de color", () => {
    expect(furniIconUrl("rare_dragonlamp*1", 74723)).toBe("https://images.habbo.com/dcr/hof_furni/74723/rare_dragonlamp_1_icon.png");
    expect(furniIconUrl("x", 0)).toBeNull();
  });
});

describe("formatos", () => {
  it("números en español", () => {
    expect(formatPrice(2849)).toBe("2.849");
    expect(formatPrice(42.5)).toBe("42,5");
    expect(formatPct(0.123)).toBe("+12,3 %");
    expect(formatPct(-0.5)).toBe("−50 %");
    expect(relativeTime("2026-10-17T10:00:00Z", Date.parse("2026-10-17T12:30:00Z"))).toBe("hace 3 h");
  });
});

describe("hoteles", () => {
  it("lee la lista de la configuración", () => {
    expect(parseHotelList("es, com,br,xx,es")).toEqual(["es", "com", "br"]);
    expect(parseHotelList("")).toEqual(["es", "com", "br"]);
  });
});

describe("autorización de cron", () => {
  const req = (auth?: string) => new Request("https://x/api/cron/scan", { headers: auth ? { authorization: auth } : {} });
  it("pide el secreto en producción", () => {
    expect(isAuthorizedCron(req(), { NODE_ENV: "production" } as never)).toBe(false);
    expect(isAuthorizedCron(req("Bearer s3"), { NODE_ENV: "production", CRON_SECRET: "s3" } as never)).toBe(true);
    expect(isAuthorizedCron(req("Bearer otro"), { NODE_ENV: "production", CRON_SECRET: "s3" } as never)).toBe(false);
    expect(isAuthorizedCron(req(), { NODE_ENV: "development" } as never)).toBe(true);
  });
});

describe("almacenamiento local", () => {
  let dir = "";
  afterAll(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it("guarda y lee JSON comprimido, y no deja salir de la carpeta", async () => {
    dir = await mkdtemp(path.join(tmpdir(), "fm-"));
    const fs = new FsStorage(dir);
    expect(await fs.read("summary/es.json.gz")).toBeNull();
    await fs.write("summary/es.json.gz", { hola: "mundo", n: [1, 2] });
    expect((await fs.read<{ hola: string }>("summary/es.json.gz"))?.data.hola).toBe("mundo");
    await expect(fs.write("../afuera.json.gz", {})).rejects.toThrow(/inválida/);
  });
});

describe("límite de pedidos por IP", () => {
  it("deja pasar hasta el límite, frena el resto y se reinicia con la ventana", async () => {
    const { rateLimit, resetRateLimits, clientIp } = await import("@/lib/server/rate-limit");
    resetRateLimits();
    for (let i = 0; i < 3; i++) expect(rateLimit("ip1", 3, 1000, 0).ok).toBe(true);
    expect(rateLimit("ip1", 3, 1000, 10)).toEqual({ ok: false, retryAfter: 1 });
    expect(rateLimit("ip2", 3, 1000, 10).ok).toBe(true);
    expect(rateLimit("ip1", 3, 1000, 1001).ok).toBe(true);
    expect(clientIp(new Request("https://x", { headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" } }))).toBe("1.2.3.4");
    expect(clientIp(new Request("https://x", { headers: { "x-real-ip": "5.6.7.8" } }))).toBe("5.6.7.8");
  });
});

describe("enlaces a los canales", () => {
  it("acepta solo invitaciones https de cada servicio", async () => {
    const { safeCommunityUrl, communityLinks } = await import("@/lib/community");
    expect(safeCommunityUrl("discord", "https://discord.gg/abcDEF12")).toBe("https://discord.gg/abcDEF12");
    expect(safeCommunityUrl("discord", "https://discord.com/invite/abc123")).toBe("https://discord.com/invite/abc123");
    expect(safeCommunityUrl("telegram", "https://t.me/BomhamsOfertas")).toBe("https://t.me/BomhamsOfertas");
    expect(safeCommunityUrl("whatsapp", "https://whatsapp.com/channel/0029VaAbCdEfGh123")).toBe("https://whatsapp.com/channel/0029VaAbCdEfGh123");
    for (const [id, bad] of [
      ["discord", "http://discord.gg/abc"],
      ["discord", "https://evil.example/discord.gg/abc"],
      ["telegram", "https://t.me.evil.example/x"],
      ["telegram", "javascript:alert(1)"],
      ["whatsapp", "https://whatsapp.com.evil.example/channel/0029Va"],
    ] as const) {
      expect(safeCommunityUrl(id, bad)).toBeNull();
    }
    expect(communityLinks({ telegram: "https://t.me/BomhamsOfertas", discord: "malo" }).map((l) => l.id)).toEqual(["telegram"]);
    expect(communityLinks({})).toEqual([]);
  });
});
