import { describe, expect, it } from "vitest";
import { csvName, toCsv } from "@/lib/csv";
import { COMPARISON, PLAN_FEATURES, PLANS_TEXT } from "@/lib/i18n/plans";
import { planOf } from "@/lib/accounts/service";

function shape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)]));
  return typeof value;
}

describe("planes y comparación", () => {
  it("los tres idiomas tienen los mismos textos", () => {
    expect(shape(PLANS_TEXT.pt)).toEqual(shape(PLANS_TEXT.es));
    expect(shape(PLANS_TEXT.en)).toEqual(shape(PLANS_TEXT.es));
  });

  it("cada fila tiene su texto y lo que es VIP no está en Standard", () => {
    for (const row of COMPARISON) expect(PLANS_TEXT.es.rows[row.key][0]).toBeTruthy();
    for (const f of PLAN_FEATURES) expect(f.vip).toBe(true);
    expect(PLAN_FEATURES.filter((f) => !f.standard).map((f) => f.key)).toEqual(["csv", "badge", "early"]);
  });

  it("sin plan guardado, la cuenta es Standard", () => {
    expect(planOf(undefined)).toBe("standard");
    expect(planOf({})).toBe("standard");
    expect(planOf({ plan: "vip" })).toBe("vip");
  });
});

describe("exportar a CSV", () => {
  it("escapa comas, comillas y fórmulas, y agrega el BOM para Excel", () => {
    const csv = toCsv([
      ["Nombre", "Precio"],
      ['Sofá "HC", rojo', 1200],
      ["=HYPERLINK(1)", null],
    ]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Sofá ""HC"", rojo",1200');
    expect(csv).toContain("'=HYPERLINK(1),");
    expect(csvName("Ranking: Más vendidos!", new Date("2026-10-25T10:00:00Z"))).toBe("ranking-m-s-vendidos-2026-10-25.csv");
  });
});
