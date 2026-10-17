import { describe, expect, it } from "vitest";
import { normalizeItem } from "@/lib/habbo/api";
import { discount, isActive, referencePrice, summarize, weeklyChange } from "@/lib/market/stats";
import { day, rawItem } from "../helpers";

const stats = (extra: Parameters<typeof rawItem>[1]) => normalizeItem(rawItem("x", extra), "r")!;

describe("summarize", () => {
  const s = summarize(
    stats({
      currentPrice: 40,
      currentOpenOffers: 279,
      averagePrice: 39,
      history: [day(-30, 30, 10), day(-10, 38, 10), day(-8, 40, 10), day(-3, 50, 10), day(-1, 40, 30)],
    }),
    1000,
  );

  it("calcula ventas y promedios ponderados por ventana", () => {
    expect(s.s1).toBe(30);
    expect(s.s7).toBe(40);
    expect(s.s7p).toBe(20);
    expect(s.s30).toBe(70);
    expect(s.a7).toBe(42.5); // (50*10 + 40*30) / 40
    expect(s.p7).toBe(39); // (38*10 + 40*10) / 20
    expect(s.c7).toBe(1700);
    expect(s.ls).toBe(1);
    expect(s.at).toBe(1000);
  });

  it("arma el minigráfico de 30 días con huecos en los días sin ventas", () => {
    expect(s.sp).toHaveLength(30);
    expect(s.sp[0]).toBe(30); // -30
    expect(s.sp[29]).toBe(40); // -1
    expect(s.sp[15]).toBeNull();
  });

  it("deja el minigráfico vacío si no hubo ventas", () => {
    expect(summarize(stats({ currentPrice: 5, currentOpenOffers: 2 })).sp).toEqual([]);
  });
});

describe("referencePrice / weeklyChange / discount", () => {
  it("usa el promedio de 7 días si hay volumen y si no el de 30", () => {
    const base = { a7: 10, s7: 5, a30: 12, s30: 20, ap: 11 };
    expect(referencePrice(base)).toBe(10);
    expect(referencePrice({ ...base, s7: 1 })).toBe(12);
    expect(referencePrice({ ...base, s7: 1, s30: 2 })).toBe(11);
    expect(referencePrice({ a7: null, s7: 0, a30: null, s30: 0, ap: 50 })).toBeNull();
  });

  it("no informa variación con poco volumen", () => {
    const s = summarize(stats({ history: [day(-10, 10, 10), day(-2, 15, 10)] }));
    expect(weeklyChange(s)).toBeCloseTo(0.5);
    const thin = summarize(stats({ history: [day(-10, 10, 2), day(-2, 15, 10)] }));
    expect(weeklyChange(thin)).toBeNull();
  });

  it("calcula cuánto más barato está el precio mínimo", () => {
    const s = summarize(stats({ currentPrice: 7, currentOpenOffers: 1, history: [day(-2, 10, 5)] }));
    expect(discount(s)).toBeCloseTo(0.3);
    expect(discount({ ...s, oo: 0 })).toBeNull();
  });

  it("marca actividad por ventas u ofertas", () => {
    expect(isActive(summarize(stats({})))).toBe(false);
    expect(isActive(summarize(stats({ currentOpenOffers: 1, currentPrice: 3 })))).toBe(true);
  });
});
