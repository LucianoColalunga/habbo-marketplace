import { describe, expect, it, vi } from "vitest";
import { ImmutableClient, listSalesSince, normalizeSale, normalizeStack, saleUsd } from "@/lib/nft/api";
import { NFT_COLLECTIONS } from "@/lib/nft/collections";
import { emptyNftHistory, type NftHistory, type NftRow, type NftSummary } from "@/lib/nft/model";
import { buildNftRanking, nftDiscount, nftWeeklyChange } from "@/lib/nft/rankings";
import { addSalesToDays, buildRows, nftKeys, runNftScan } from "@/lib/nft/scan";
import { fakeClock, jsonResponse, MemoryStorage } from "../helpers";

const FURNI = NFT_COLLECTIONS[0].address;
const WETH = "0x52a6c53869ce09a731cd772f245b97a4401d3348";
const ID1 = "019c05de-fd53-99ad-99be-cb21be61ab86";
const ID2 = "019c05de-c6af-968e-b4b0-89b589458688";

function rawStack(id: string, name: string, floorUsd: string | null, extra: Record<string, unknown> = {}) {
  return {
    stack: {
      stack_id: id,
      contract_address: FURNI,
      name,
      image: `https://nft-tokens.habbo.com/collectibles/furni/images/${name}.png`,
      attributes: [
        { trait_type: "rarity", value: "Rare" },
        { trait_type: "itemType", value: "Furni" },
        { trait_type: "productCode", value: "nft_x" },
      ],
    },
    stack_count: 3695,
    listings: floorUsd ? [{ token_id: "1" }, { token_id: "2" }] : [],
    market: {
      floor_listing: floorUsd
        ? {
            token_id: "1",
            price_details: {
              fee_inclusive_amount: "121871559633026",
              converted_prices: { USD: floorUsd },
              token: { decimals: 18, symbol: "ETH" },
            },
          }
        : null,
      last_trade: { created_at: "2026-10-17T02:11:42Z", price_details: [{ converted_prices: { USD: "0.30" } }] },
      top_bid: null,
    },
    ...extra,
  };
}

function rawSale(id: string, at: string, tokenId: string, wei: string, token: string | null = WETH) {
  return {
    id,
    indexed_at: at,
    type: "sale",
    details: {
      asset: [{ contract_address: FURNI, token_id: tokenId }],
      payment: { price_including_fees: wei, token: { contract_address: token } },
    },
  };
}

describe("normalización de Immutable", () => {
  it("arma un modelo con piso, nativo, rareza y unidades", () => {
    const s = normalizeStack(rawStack(ID1, "Plaque", "0.29"))!;
    expect(s).toMatchObject({ id: ID1, n: "Plaque", rarity: "Rare", type: "Furni", code: "nft_x", supply: 3695, floorUsd: 0.29, listed: 2 });
    expect(s.floorNative?.symbol).toBe("ETH");
    expect(s.floorNative?.amount).toBeCloseTo(0.000121871559633026);
    expect(s.lastUsd).toBe(0.3);
  });

  it("descarta ids raros e imágenes que no son https", () => {
    expect(normalizeStack(rawStack("../../x", "X", "1"))).toBeNull();
    const bad = rawStack(ID1, "X", null);
    (bad.stack as { image: string }).image = "javascript:alert(1)";
    expect(normalizeStack(bad)!.img).toBe("");
    expect(normalizeStack(bad)!.floorUsd).toBeNull();
  });

  it("convierte ventas en ETH e IMX nativo", () => {
    const eth = normalizeSale(rawSale("a", "2026-10-17T10:00:00Z", "5", "148999999999999"))!;
    expect(eth).toMatchObject({ symbol: "ETH", tokenId: "5", rateId: "ethereum" });
    expect(saleUsd(eth, { ethereum: 2400 })).toBeCloseTo(0.3576, 3);
    const imx = normalizeSale(rawSale("b", "2026-10-17T10:00:00Z", "6", "2000000000000000000", null))!;
    expect(imx.symbol).toBe("IMX");
    expect(normalizeSale(rawSale("c", "x", "7", "0"))).toBeNull();
    expect(normalizeSale(rawSale("d", "2026-10-17T10:00:00Z", "8", "10", "0xdesconocido"))).toBeNull();
  });
});

describe("cliente con ritmo y reintentos", () => {
  it("espera según x-ratelimit-reset ante un 429", async () => {
    const clock = fakeClock();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 429, headers: { "x-ratelimit-reset": "1" } }))
      .mockImplementation(async () => jsonResponse({ ok: true }));
    const client = new ImmutableClient({ fetchImpl, sleep: clock.sleep, now: clock.now, intervalMs: 250 });
    expect(await client.get("https://x")).toEqual({ ok: true });
    expect(clock.sleeps).toContain(1000);
    expect(client.requests).toBe(2);
  });

  it("no reintenta un 400", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("", { status: 400 }));
    const client = new ImmutableClient({ fetchImpl, sleep: async () => {}, intervalMs: 0 });
    await expect(client.get("https://x")).rejects.toThrow(/400/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("lee ventas hasta la última ya procesada", async () => {
    const pages = [
      { result: [rawSale("3", "2026-10-17T12:00:00Z", "1", "1000"), rawSale("2", "2026-10-17T11:00:00Z", "2", "1000")], page: { next_cursor: "c" } },
      { result: [rawSale("1", "2026-10-17T10:00:00Z", "3", "1000")], page: { next_cursor: "d" } },
    ];
    const fetchImpl = vi.fn(async () => jsonResponse(pages.shift()));
    const client = new ImmutableClient({ fetchImpl: fetchImpl as never, sleep: async () => {}, intervalMs: 0 });
    const res = await listSalesSince(client, FURNI, "2026-10-17T10:00:00Z", 10);
    expect(res.sales.map((s) => s.id)).toEqual(["3", "2"]);
    expect(res.complete).toBe(true);
  });
});

describe("historial de ventas", () => {
  it("agrupa por día y suma dólares", () => {
    const days: NftHistory["days"] = {};
    addSalesToDays(days, [
      { stackId: ID1, at: "2026-10-16T10:00:00Z", usd: 0.3 },
      { stackId: ID1, at: "2026-10-16T23:59:00Z", usd: 0.5 },
      { stackId: ID1, at: "2026-10-17T00:01:00Z", usd: 1 },
    ]);
    expect(days[ID1]).toEqual([
      [20261016, 2, 0.8],
      [20261017, 1, 1],
    ]);
  });

  it("calcula ventanas de 7 días e incluye modelos vendidos sin publicaciones", () => {
    const h = emptyNftHistory();
    h.days[ID1] = [
      [20261005, 4, 4],
      [20261015, 5, 10],
    ];
    h.days[ID2] = [[20261016, 3, 3]];
    h.meta[ID2] = { c: FURNI, n: "Nylon", img: "", rarity: "Common", type: "Clothes" };
    const rows = buildRows([normalizeStack(rawStack(ID1, "Plaque", "1"))!], h, new Date("2026-10-17T12:00:00Z"), 1);
    expect(rows[ID1]).toMatchObject({ s7: 5, s7p: 4, a7: 2, p7: 1, s30: 9, v7: 10 });
    expect(rows[ID1].sp).toHaveLength(30);
    expect(rows[ID2]).toMatchObject({ n: "Nylon", floorUsd: null, s7: 3 });
  });
});

describe("rankings NFT", () => {
  const row = (over: Partial<NftRow>): NftRow =>
    ({
      id: ID1, c: FURNI, n: "x", img: "", rarity: "", type: "", subType: "", set: "", source: "", code: "", supply: 0,
      floorUsd: null, floorNative: null, bidUsd: null, lastUsd: null, lastAt: null, listed: 0, floorToken: null, at: 0,
      s7: 0, s7p: 0, s30: 0, v7: 0, a7: null, p7: null, a30: null, sp: [], ...over,
    }) as NftRow;

  it("subas y ofertas piden volumen mínimo", () => {
    expect(nftWeeklyChange(row({ a7: 2, p7: 1, s7: 3, s7p: 3 }))).toBeCloseTo(1);
    expect(nftWeeklyChange(row({ a7: 2, p7: 1, s7: 2, s7p: 3 }))).toBeNull();
    expect(nftDiscount(row({ floorUsd: 0.5, a7: 1, s7: 3 }))).toBeCloseTo(0.5);
    expect(nftDiscount(row({ floorUsd: 0.01, a7: 1, s7: 3 }))).toBeNull();
  });

  it("'más caros' usa ventas reales y no pisos absurdos", () => {
    const rows = [
      row({ id: "a", floorUsd: 239218, a30: null, s30: 0 }),
      row({ id: "b", floorUsd: 50, a30: 40, s30: 3 }),
      row({ id: "c", floorUsd: 10, a30: 60, s30: 2 }),
    ];
    expect(buildNftRanking(rows, "caros", 5).map((r) => r.id)).toEqual(["c", "b"]);
  });
});

describe("runNftScan", () => {
  function fakeImmutable(sales: ReturnType<typeof rawSale>[]) {
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("/fiat/conversion")) return jsonResponse({ ethereum: { usd: 2400 }, "immutable-x": { usd: 0.15 } });
      if (url.includes("/search/stacks")) {
        return jsonResponse({ result: url.includes(FURNI) ? [rawStack(ID1, "Plaque", "0.29")] : [], page: { next_cursor: null } });
      }
      if (url.includes("/activities")) return jsonResponse({ result: url.includes(FURNI) ? sales : [], page: { next_cursor: null } });
      if (url.includes("/nfts?")) {
        return jsonResponse({
          result: [
            { token_id: "10", metadata_id: ID1, name: "Plaque", image: "", attributes: [] },
            { token_id: "11", metadata_id: ID2, name: "Nylon", image: "", attributes: [{ trait_type: "rarity", value: "Common" }] },
          ],
        });
      }
      return new Response("", { status: 404 });
    });
    return { fetchImpl, calls };
  }

  it("guarda resumen e historial, y la segunda corrida solo suma ventas nuevas sin repetir búsquedas", async () => {
    const storage = new MemoryStorage();
    const now = new Date();
    const at = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString();
    const first = fakeImmutable([rawSale("s2", at(1), "11", "1000000000000000"), rawSale("s1", at(2), "10", "500000000000000")]);
    const summary = await runNftScan({ storage, fetchImpl: first.fetchImpl as never, intervalMs: 0, sleep: async () => {}, nowDate: () => now });
    expect(summary.scan.listedStacks).toBe(1);
    expect(summary.scan.newSales).toBe(2);
    expect(summary.stacks[ID1]).toMatchObject({ floorUsd: 0.29, s7: 1 });
    expect(summary.stacks[ID2]).toMatchObject({ n: "Nylon", s7: 1 });
    expect(storage.writes).toEqual([nftKeys.history(), nftKeys.summary()]);

    const second = fakeImmutable([rawSale("s3", at(0.5), "10", "500000000000000"), rawSale("s2", at(1), "11", "1000000000000000")]);
    const again = await runNftScan({ storage, fetchImpl: second.fetchImpl as never, intervalMs: 0, sleep: async () => {}, nowDate: () => now });
    expect(again.scan.newSales).toBe(1);
    expect(second.calls.some((u) => u.includes("/nfts?"))).toBe(false); // el token 10 ya estaba en la caché
    const saved = (await storage.read<NftSummary>(nftKeys.summary()))!.data;
    expect(saved.stacks[ID1].s7).toBe(2);
  });
});
