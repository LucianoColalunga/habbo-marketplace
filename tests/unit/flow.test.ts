import { describe, expect, it } from "vitest";
import { flowTotals, marketFlow } from "@/lib/market/flow";

const minute = (iso: string) => Math.floor(Date.parse(iso) / 60000);
const now = Date.parse("2026-10-25T10:00:00Z");

describe("movimiento por día del mercado de créditos", () => {
  const history = {
    days: {
      // [fecha, promedio, vendidas, ofertas]
      trono: [
        [20261023, 100, 3, 9],
        [20261024, 110, 2, 8],
      ] as [number, number, number, number][],
      silla: [[20261024, 5, 10, 1]] as [number, number, number, number][],
    },
    snaps: {
      // [minuto, precio mínimo, publicaciones]
      trono: [
        [minute("2026-10-22T08:00:00Z"), 100, 7],
        [minute("2026-10-24T20:00:00Z"), 120, 4],
      ] as [number, number, number][],
    },
    seen: {
      trono: minute("2026-10-25T03:00:00Z"), // se volvió a consultar después del 24
      silla: minute("2026-10-24T12:00:00Z"), // todavía no tiene el día 24 completo
    },
  };
  const items = { trono: { oo: 4, s30: 90 }, silla: { oo: 0, s30: 9 } };

  it("suma vendidas y créditos, y solo muestra los días ya completos", () => {
    const flow = marketFlow(["trono", "silla"], history, items, now);
    const byDate = Object.fromEntries(flow.days.map((d) => [d[0], d]));
    // El 23: los dos furnis se actualizaron después de que terminó.
    expect(byDate[20261023]).toEqual([20261023, 3, 300, 7]);
    // El 24: la silla no se volvió a consultar, pero pesa poco (9 de 99 ventas): igual entra (cobertura > 90 %).
    expect(byDate[20261024]).toEqual([20261024, 12, 270, 4]);
    // Hoy no se muestra.
    expect(byDate[20261025]).toBeUndefined();
    expect(flow.offersNow).toBe(4);
    expect(flow.itemsWithOffers).toBe(1);
  });

  it("no muestra un día si los furnis que más se venden no se actualizaron", () => {
    const flow = marketFlow(["trono", "silla"], { ...history, seen: { silla: minute("2026-10-25T03:00:00Z") } }, items, now);
    expect(flow.days).toEqual([]);
  });

  it("antes de la primera medición, las publicaciones quedan sin dato", () => {
    const flow = marketFlow(["trono"], history, items, now);
    const early = flow.days.find((d) => d[0] === 20261021);
    expect(early?.[3]).toBeNull();
    expect(flowTotals(flow.days, 2)).toEqual({ count: 2, sold: 5, credits: 520 });
  });

  it("los furnis que no se venden no frenan los días, y un grupo sin ventas muestra ceros", () => {
    const many = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`nada${i}`, { oo: 1, s30: 0 }]));
    const flow = marketFlow(["trono", ...Object.keys(many)], history, { ...items, ...many }, now);
    expect(flow.days.some((d) => d[0] === 20261024)).toBe(true);
    const empty = marketFlow(Object.keys(many), { days: {}, snaps: {}, seen: {} }, many, now);
    expect(empty.days).toHaveLength(30);
    expect(empty.days.every((d) => d[1] === 0 && d[2] === 0)).toBe(true);
  });
});
