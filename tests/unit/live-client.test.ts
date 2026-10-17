import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLive, LiveLimitError } from "@/lib/habbo/live-client";
import { jsonResponse, rawItem } from "../helpers";

function mockApi() {
  const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    expect(init?.credentials).toBe("omit");
    return jsonResponse({
      status: "OK",
      roomItemData: body.roomItems.map(({ item }: { item: string }) => rawItem(item, { currentPrice: 5, currentOpenOffers: 1 })),
      wallItemData: [],
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("consulta en vivo desde el navegador", () => {
  it("reutiliza la respuesta durante un minuto", async () => {
    vi.useFakeTimers({ now: Date.UTC(2026, 9, 17, 10) });
    const fetchMock = mockApi();
    const a = await fetchLive("es", [{ name: "throne", type: "r" }]);
    const b = await fetchLive("es", [{ name: "throne", type: "r" }]);
    expect(a.stats.get("throne")?.currentPrice).toBe(5);
    expect(b.stats.get("throne")?.currentPrice).toBe(5);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("no pasa de 6 pedidos por minuto y avisa cuando se llega al límite", async () => {
    vi.useFakeTimers({ now: Date.UTC(2026, 9, 17, 11) });
    const fetchMock = mockApi();
    const many = Array.from({ length: 7 * 25 }, (_, i) => ({ name: `f${i}`, type: "r" as const }));
    const res = await fetchLive("com", many, { force: true });
    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(res.skipped).toHaveLength(25);
    await expect(fetchLive("com", [{ name: "otro", type: "r" }], { force: true })).rejects.toBeInstanceOf(LiveLimitError);
    vi.setSystemTime(Date.UTC(2026, 9, 17, 11, 1, 1));
    await expect(fetchLive("com", [{ name: "otro", type: "r" }], { force: true })).resolves.toBeDefined();
  });

  it("informa el 429 de Habbo como límite", async () => {
    vi.useFakeTimers({ now: Date.UTC(2026, 9, 17, 12) });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 429 })));
    await expect(fetchLive("br", [{ name: "x", type: "r" }], { force: true })).rejects.toBeInstanceOf(LiveLimitError);
  });
});
