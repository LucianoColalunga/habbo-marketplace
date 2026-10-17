import { describe, expect, it } from "vitest";
import { buildDeals, buildRanking, MAX_AGE, totals } from "@/lib/data/rankings";
import { normalizeItem } from "@/lib/habbo/api";
import type { CatalogItem } from "@/lib/habbo/furnidata";
import { dealFor, findDeals } from "@/lib/market/deals";
import { summarize, type ItemSummary } from "@/lib/market/stats";
import { day, rawItem } from "../helpers";

const NOW = 1_000_000;
function item(k: string, extra: Parameters<typeof rawItem>[1], at = NOW): [string, ItemSummary] {
  return [k, summarize(normalizeItem(rawItem(k, extra), "r")!, at)];
}

const items = Object.fromEntries([
  item("popular", { currentPrice: 40, currentOpenOffers: 200, history: [day(-10, 40, 50), day(-2, 40, 100)] }),
  item("subiendo", { currentPrice: 30, currentOpenOffers: 5, history: [day(-10, 20, 10), day(-2, 30, 10)] }),
  item("bajando", { currentPrice: 15, currentOpenOffers: 5, history: [day(-10, 20, 10), day(-2, 15, 10)] }),
  item("ganga", { currentPrice: 60, currentOpenOffers: 1, history: [day(-3, 100, 10)] }),
  item("viejo", { currentPrice: 1, currentOpenOffers: 1, history: [day(-3, 100, 10)] }, NOW - MAX_AGE.deals - 1),
  item("muerto", {}),
]);
const byKey = new Map<string, CatalogItem>([["popular", { k: "popular", t: "r", n: "Popular", d: "", r: 3, c: "chair", l: "" }]]);

describe("rankings", () => {
  it("más vendidos por unidades de 7 días", () => {
    const rows = buildRanking(items, byKey, "vendidos", 3, NOW);
    expect(rows[0].k).toBe("popular");
    expect(rows[0].n).toBe("Popular");
    expect(rows[0].s7).toBe(100);
  });

  it("subas y bajas con volumen mínimo", () => {
    expect(buildRanking(items, byKey, "subas", 5, NOW).map((r) => r.k)).toEqual(["subiendo"]);
    expect(buildRanking(items, byKey, "bajas", 5, NOW).map((r) => r.k)).toEqual(["bajando"]);
  });

  it("más publicados", () => {
    expect(buildRanking(items, byKey, "ofertados", 1, NOW)[0].k).toBe("popular");
  });

  it("totales cuentan solo furnis con actividad", () => {
    expect(totals(items).active).toBe(5);
  });
});

describe("ofertas detectadas", () => {
  it("detecta un precio mínimo muy por debajo del promedio", () => {
    const d = dealFor("es", "ganga", items.ganga)!;
    expect(d.pct).toBeCloseTo(0.4);
    expect(d.saving).toBe(40);
  });

  it("ignora furnis baratos, con poco volumen o sin ofertas", () => {
    expect(dealFor("es", "popular", items.popular)).toBeNull();
    expect(dealFor("es", "x", { ...items.ganga, s30: 2 })).toBeNull();
    expect(dealFor("es", "x", { ...items.ganga, oo: 0 })).toBeNull();
    const cheap = summarize(normalizeItem(rawItem("c", { currentPrice: 1, currentOpenOffers: 1, history: [day(-1, 3, 20)] }), "r")!);
    expect(dealFor("es", "c", cheap)).toBeNull();
  });

  it("no confunde un mercado que ya bajó ni uno saturado con una ganga", () => {
    // Se vendía a ~250, pero esta semana ya se vende a 2: no es oferta.
    const bajo = summarize(
      normalizeItem(rawItem("muro", { currentPrice: 2, currentOpenOffers: 4, history: [day(-12, 255, 3), day(-5, 2, 1), day(-3, 2, 1)] }), "r")!,
    );
    expect(dealFor("es", "muro", bajo)).toBeNull();
    // Sin ventas en la semana: no hay referencia actual.
    const quieto = summarize(normalizeItem(rawItem("q", { currentPrice: 11, currentOpenOffers: 3, history: [day(-12, 180, 13)] }), "r")!);
    expect(dealFor("es", "q", quieto)).toBeNull();
    // Muchas más ofertas que ventas: saturado.
    const saturado = summarize(
      normalizeItem(rawItem("s", { currentPrice: 2, currentOpenOffers: 39, history: [day(-2, 149, 4), day(-20, 2, 3)] }), "r")!,
    );
    expect(dealFor("es", "s", saturado)).toBeNull();
  });

  it("descarta datos viejos en la lista de ofertas", () => {
    expect(findDeals("es", items).map((d) => d.k)).toContain("viejo");
    expect(buildDeals("es", items, byKey, "pct", 10, NOW).map((d) => d.k)).toEqual(["ganga"]);
  });
});
