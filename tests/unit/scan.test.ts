import { describe, expect, it, vi } from "vitest";
import { compactFurnidata, type Catalog } from "@/lib/habbo/furnidata";
import type { MarketHistory } from "@/lib/market/history";
import { coverageOf, pickItems, runScan, scanPriority } from "@/lib/market/scan";
import { summarize } from "@/lib/market/stats";
import type { MarketSummary } from "@/lib/market/summary";
import { keys } from "@/lib/storage";
import { normalizeItem } from "@/lib/habbo/api";
import { day, fakeClock, jsonResponse, MemoryStorage, rawItem } from "../helpers";

const furnidata = {
  roomitemtypes: {
    furnitype: [
      { classname: "throne", name: "Trono", description: "Para HC", revision: 45512, category: "chair", furniline: "rare", tradeable: true },
      { classname: "club_sofa", name: "  Sofá   HC ", revision: 1, category: "chair", tradeable: true },
      { classname: "no_trade", name: "No", tradeable: false },
      { classname: "throne", name: "Duplicado", tradeable: true },
      ...Array.from({ length: 120 }, (_, i) => ({ classname: `f${i}`, name: `Furni ${i}`, revision: 2, tradeable: true })),
    ],
  },
  wallitemtypes: { furnitype: [{ classname: "poster", name: "Póster", revision: 56783, tradeable: true }] },
};

describe("compactFurnidata", () => {
  it("se queda solo con lo intercambiable, sin duplicados y con textos limpios", () => {
    const c = compactFurnidata(furnidata, "es", "h1", "2026-10-17T00:00:00Z");
    expect(c.items.find((i) => i.k === "no_trade")).toBeUndefined();
    expect(c.items.filter((i) => i.k === "throne")).toHaveLength(1);
    expect(c.items.find((i) => i.k === "club_sofa")?.n).toBe("Sofá HC");
    expect(c.items.find((i) => i.k === "poster")?.t).toBe("w");
    expect(c.items.find((i) => i.k === "club_sofa")?.c).toBe("chair");
  });
});

function catalogOf(names: string[]): Catalog {
  return {
    v: 1,
    hotel: "es",
    hash: "h",
    fetchedAt: "",
    items: names.map((k) => ({ k, t: "r" as const, n: k, d: "", r: 1, c: "other", l: "" })),
  };
}

describe("prioridad del escaneo rotativo", () => {
  const now = 100_000;
  const sum = (s30: number, at: number) => ({ ...summarize(normalizeItem(rawItem("x"), "r")!, at), s30 });

  it("primero lo vigilado, después lo nunca escaneado, después lo activo y viejo", () => {
    expect(scanPriority(undefined, now, 0, true)).toBeGreaterThan(scanPriority(undefined, now, 0, false));
    expect(scanPriority(undefined, now, 0, false)).toBeGreaterThan(scanPriority(sum(1000, 0), now, 0, false));
    // Mismo tiempo sin escanear: pesa más el que más vende.
    expect(scanPriority(sum(500, now - 600), now, 0, false)).toBeGreaterThan(scanPriority(sum(0, now - 600), now, 0, false));
  });

  it("elige como mucho 25 por pedido y respeta el orden", () => {
    const catalog = catalogOf(Array.from({ length: 100 }, (_, i) => `f${i}`));
    const previous = {
      items: Object.fromEntries(catalog.items.map((i, idx) => [i.k, sum(idx, now - 60)])),
    } as unknown as MarketSummary;
    delete previous.items.f3; // nunca escaneado
    const picked = pickItems(catalog, previous, now, 2, new Set(["f50"]));
    expect(picked).toHaveLength(50);
    expect(picked[0].name).toBe("f50");
    expect(picked[1].name).toBe("f3");
    expect(picked[2].name).toBe("f99"); // el que más vende
  });

  it("calcula la cobertura", () => {
    const items = { a: sum(1, now - 60), b: sum(1, now - 60 * 30), c: sum(1, now - 60 * 100) };
    expect(coverageOf(items, 10, now)).toEqual({ catalog: 10, ever: 3, last24h: 1, last72h: 2 });
  });
});

describe("runScan", () => {
  function fakeHabbo() {
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith("/gamedata/hashes2")) return jsonResponse({ hashes: [{ name: "furnidata", hash: "abc" }] });
      if (url.includes("/gamedata/furnidata_json/abc")) return jsonResponse(furnidata);
      const body = JSON.parse(String(init?.body));
      return jsonResponse({
        status: "OK",
        roomItemData: body.roomItems.map(({ item }: { item: string }) =>
          rawItem(item, item === "throne" ? { currentPrice: 2849, currentOpenOffers: 7, history: [day(-1, 2800, 2)] } : {}),
        ),
        wallItemData: body.wallItems.map(({ item }: { item: string }) => rawItem(item)),
      });
    });
    return { fetchImpl, calls };
  }

  it("descarga el catálogo, escanea y guarda resumen e historial", async () => {
    const storage = new MemoryStorage();
    const clock = fakeClock();
    const { fetchImpl } = fakeHabbo();
    const out = await runScan("es", { storage, fetchImpl, full: true, intervalMs: 1000, sleep: clock.sleep, now: clock.date });
    expect(out.status).toBe("done");
    if (out.status !== "done") return;
    expect(out.summary.scan.requests).toBe(5); // 122 de suelo -> 5 pedidos; el póster viaja en el primero
    expect(out.summary.items.throne.cp).toBe(2849);
    expect(out.summary.coverage.ever).toBe(123); // 122 de suelo + 1 de pared
    expect(storage.writes).toEqual([keys.catalog("es"), keys.history("es"), keys.summary("es")]);
    const history = (await storage.read<MarketHistory>(keys.history("es")))!.data;
    expect(history.days.throne).toEqual([[20261016, 2800, 2, 10]]);
  });

  it("no vuelve a correr enseguida salvo que se fuerce, y no re-descarga el catálogo si no cambió", async () => {
    const storage = new MemoryStorage();
    const clock = fakeClock();
    const { fetchImpl, calls } = fakeHabbo();
    await runScan("es", { storage, fetchImpl, full: true, intervalMs: 1000, sleep: clock.sleep, now: clock.date });
    const second = await runScan("es", { storage, fetchImpl, intervalMs: 1000, sleep: clock.sleep, now: clock.date });
    expect(second.status).toBe("skipped");
    clock.advance(30 * 60_000);
    calls.length = 0;
    const third = await runScan("es", { storage, fetchImpl, intervalMs: 1000, timeBudgetMs: 2500, sleep: clock.sleep, now: clock.date });
    expect(third.status).toBe("done");
    expect(calls.some((c) => c.includes("furnidata_json"))).toBe(false);
    // Corrida corta: como mucho 3 pedidos.
    expect(calls.filter((c) => c.includes("marketplace")).length).toBeLessThanOrEqual(3);
  });

  it("falla si la API no devuelve nada", async () => {
    const storage = new MemoryStorage();
    const clock = fakeClock();
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/gamedata/hashes2")) return jsonResponse({ hashes: [{ name: "furnidata", hash: "abc" }] });
      if (url.includes("furnidata_json")) return jsonResponse(furnidata);
      return new Response("", { status: 400 });
    });
    await expect(runScan("es", { storage, fetchImpl, full: true, intervalMs: 10, sleep: clock.sleep, now: clock.date })).rejects.toThrow(
      /no devolvió datos/,
    );
    expect(storage.writes).toEqual([keys.catalog("es")]);
  });
});
