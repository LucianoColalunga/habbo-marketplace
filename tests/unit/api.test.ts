import { describe, expect, it, vi } from "vitest";
import {
  fetchBatch,
  fetchMany,
  HabboApiError,
  makeBatches,
  normalizeItem,
  parseBatchResponse,
  retryDelay,
  type ItemRef,
} from "@/lib/habbo/api";
import { day, fakeClock, jsonResponse, rawItem } from "../helpers";

describe("normalizeItem", () => {
  it("convierte el historial de texto a números y lo ordena del más viejo al más nuevo", () => {
    const n = normalizeItem(
      rawItem("throne", { currentPrice: 2849, currentOpenOffers: 7, averagePrice: 2842, history: [day(-1, 2900, 2), day(-22, 2714, 1)] }),
      "r",
    )!;
    expect(n.currentPrice).toBe(2849);
    expect(n.history.map((h) => h.offset)).toEqual([-22, -1]);
    expect(n.history[1]).toEqual({ offset: -1, avg: 2900, sold: 2, credits: 5800, offers: 10 });
  });

  it("descarta entradas sin nombre y valores raros", () => {
    expect(normalizeItem({} as never, "r")).toBeNull();
    const n = normalizeItem({ item: "x", currentPrice: -5, history: [{ dayOffset: "abc" } as never] } as never, "w")!;
    expect(n.currentPrice).toBe(0);
    expect(n.history).toEqual([]); // offset 0 no es un día del historial
    expect(n.type).toBe("w");
  });
});

describe("parseBatchResponse", () => {
  it("separa furnis de suelo y de pared", () => {
    const out = parseBatchResponse({ status: "OK", roomItemData: [rawItem("a")], wallItemData: [rawItem("b")] } as never);
    expect(out.map((o) => [o.item, o.type])).toEqual([
      ["a", "r"],
      ["b", "w"],
    ]);
  });

  it("falla si la API no responde OK", () => {
    expect(() => parseBatchResponse({ status: "NOK", message: "Too many items" } as never)).toThrow(/Too many items/);
  });
});

describe("makeBatches", () => {
  it("respeta el máximo de 25 por tipo y combina suelo y pared en el mismo pedido", () => {
    const items: ItemRef[] = [
      ...Array.from({ length: 60 }, (_, i) => ({ name: `r${i}`, type: "r" as const })),
      ...Array.from({ length: 30 }, (_, i) => ({ name: `w${i}`, type: "w" as const })),
      { name: "r0", type: "r" },
    ];
    const batches = makeBatches(items);
    expect(batches).toHaveLength(3);
    expect(batches[0].room).toHaveLength(25);
    expect(batches[0].wall).toHaveLength(25);
    expect(batches[1].wall).toHaveLength(5);
    expect(batches[2].room).toHaveLength(10);
    expect(batches[2].wall).toHaveLength(0);
  });
});

describe("retryDelay", () => {
  it("espera al menos 20 s ante un 429 (la API no manda Retry-After)", () => {
    expect(retryDelay(0, 429, null)).toBe(20000);
    expect(retryDelay(0, 503, null)).toBe(1000);
    expect(retryDelay(0, 429, "5")).toBe(5000);
  });
});

describe("fetchBatch", () => {
  it("manda el cuerpo en el formato documentado y devuelve los datos", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toEqual({ roomItems: [{ item: "throne" }], wallItems: [{ item: "poster" }] });
      return jsonResponse({ status: "OK", roomItemData: [rawItem("throne", { currentPrice: 10 })], wallItemData: [] });
    });
    const out = await fetchBatch("es", { room: ["throne"], wall: ["poster"] }, { fetchImpl: fetchImpl as never });
    expect(fetchImpl).toHaveBeenCalledWith("https://www.habbo.es/api/public/marketplace/stats/batch", expect.anything());
    expect(out[0].currentPrice).toBe(10);
  });

  it("reintenta tras un 429, avisando que hay que bajar el ritmo", async () => {
    const clock = fakeClock();
    const onRateLimited = vi.fn();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("<html>", { status: 429 }))
      .mockResolvedValueOnce(jsonResponse({ status: "OK", roomItemData: [rawItem("a")], wallItemData: [] }));
    const out = await fetchBatch("com", { room: ["a"], wall: [] }, { fetchImpl, sleep: clock.sleep, now: clock.now, onRateLimited });
    expect(out).toHaveLength(1);
    expect(onRateLimited).toHaveBeenCalledTimes(1);
    expect(clock.sleeps).toEqual([20000]);
  });

  it("no reintenta errores 400", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("bad", { status: 400 }));
    await expect(fetchBatch("es", { room: ["a"], wall: [] }, { fetchImpl, sleep: async () => {} })).rejects.toBeInstanceOf(
      HabboApiError,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("no espera para reintentar si eso pasaría el tiempo límite", async () => {
    const clock = fakeClock();
    const fetchImpl = vi.fn().mockResolvedValue(new Response("", { status: 429 }));
    await expect(
      fetchBatch("es", { room: ["a"], wall: [] }, { fetchImpl, sleep: clock.sleep, now: clock.now, deadline: clock.now() + 5000 }),
    ).rejects.toThrow(/429/);
    expect(clock.sleeps).toEqual([]);
  });

  it("rechaza lotes de más de 25", async () => {
    await expect(fetchBatch("es", { room: Array.from({ length: 26 }, (_, i) => `x${i}`), wall: [] })).rejects.toThrow(/25/);
  });
});

describe("fetchMany", () => {
  const ok = (names: string[]) => jsonResponse({ status: "OK", roomItemData: names.map((n) => rawItem(n)), wallItemData: [] });
  const items = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `i${i}`, type: "r" as const }));

  it("hace un pedido por vez, espaciados por el intervalo", async () => {
    const clock = fakeClock();
    const fetchImpl = vi.fn(async (_u: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      return ok(body.roomItems.map((r: { item: string }) => r.item));
    });
    const res = await fetchMany("es", items(60), { fetchImpl: fetchImpl as never, intervalMs: 5000, sleep: clock.sleep, now: clock.now });
    expect(res.requests).toBe(3);
    expect(res.results).toHaveLength(60);
    expect(clock.sleeps).toEqual([5000, 5000]);
    expect(res.truncated).toBe(false);
  });

  it("corta al llegar al tiempo límite y lo informa", async () => {
    const clock = fakeClock();
    const fetchImpl = vi.fn(async () => ok([]));
    const res = await fetchMany("es", items(250), {
      fetchImpl,
      intervalMs: 5000,
      sleep: clock.sleep,
      now: clock.now,
      deadline: clock.now() + 12000,
    });
    expect(res.requests).toBe(3);
    expect(res.truncated).toBe(true);
  });

  it("baja el ritmo después de un 429", async () => {
    const clock = fakeClock();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 429 }))
      .mockImplementation(async () => ok(["x"]));
    const res = await fetchMany("es", items(75), { fetchImpl, intervalMs: 4000, sleep: clock.sleep, now: clock.now });
    expect(res.rateLimited).toBe(1);
    // 20 s de espera por el 429; después el intervalo pasa de 4 s a 6 s.
    expect(clock.sleeps).toEqual([20000, 6000]);
    expect(res.failedBatches).toBe(0);
  });

  it("cuenta los lotes que fallan sin frenar el resto", async () => {
    const clock = fakeClock();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 400 }))
      .mockImplementation(async () => ok(["y"]));
    const res = await fetchMany("es", items(50), { fetchImpl, intervalMs: 1000, sleep: clock.sleep, now: clock.now });
    expect(res.failedBatches).toBe(1);
    expect(res.results).toHaveLength(1);
    expect(res.errors[0]).toMatch(/400/);
  });
});
