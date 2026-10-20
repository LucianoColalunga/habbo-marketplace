import { describe, expect, it } from "vitest";
import { normalizeItem } from "@/lib/habbo/api";
import {
  DAY_RETENTION,
  dateNumToIso,
  dayPointsFromStats,
  emptyHistory,
  mergeHistory,
  SNAP_RETENTION,
  toDateNum,
} from "@/lib/market/history";
import { lastDays, mergeDayRows, snapRows } from "@/lib/market/series";
import { day, rawItem } from "../helpers";

const s = (item: string, extra: Parameters<typeof rawItem>[1]) => normalizeItem(rawItem(item, extra), "r")!;
const at = (iso: string) => new Date(iso);

describe("fechas", () => {
  it("convierte offsets de la API en fechas absolutas", () => {
    const points = dayPointsFromStats(s("x", { statsDate: "2026-10-17", history: [day(-1, 10, 2), day(-17, 9, 1)] }));
    expect(points.map((p) => dateNumToIso(p[0]))).toEqual(["2026-09-30", "2026-10-16"]);
  });

  it("toDateNum respeta UTC", () => {
    expect(toDateNum(Date.UTC(2026, 0, 5, 23, 59))).toBe(20260105);
  });
});

describe("mergeHistory", () => {
  it("acumula días nuevos y reemplaza con el dato más reciente", () => {
    let h = emptyHistory("es");
    h = mergeHistory(h, [s("a", { statsDate: "2026-10-10", history: [day(-1, 10, 2)] })], at("2026-10-10T06:00:00Z"));
    h = mergeHistory(
      h,
      [s("a", { statsDate: "2026-10-17", history: [day(-8, 12, 3), day(-1, 11, 4)] })],
      at("2026-10-17T06:00:00Z"),
    );
    expect(h.days.a).toEqual([
      [20261009, 12, 3, 10],
      [20261016, 11, 4, 10],
    ]);
  });

  it("borra días más viejos que la retención", () => {
    const h = emptyHistory("es");
    h.days.a = [[20200101, 5, 1, 1]];
    const out = mergeHistory(h, [s("a", { statsDate: "2026-10-17", history: [day(-1, 10, 1)] })], at("2026-10-17T06:00:00Z"));
    expect(out.days.a.map((p) => p[0])).toEqual([20261016]);
    expect(DAY_RETENTION).toBeGreaterThan(365);
  });

  it("suma el último precio de los furnis consultados en corridas que no guardaron historial", () => {
    let h = mergeHistory(emptyHistory("es"), [s("a", { currentPrice: 10, currentOpenOffers: 3 })], at("2026-10-17T00:00:00Z"));
    const minute = (iso: string) => Math.floor(Date.parse(iso) / 60000);
    h = mergeHistory(h, [s("a", { currentPrice: 9, currentOpenOffers: 2 })], at("2026-10-17T08:00:00Z"), {
      a: { at: minute("2026-10-17T08:00:00Z"), cp: 9, oo: 2 },
      // consultado a las 3 h, en una corrida que no guardó historial
      b: { at: minute("2026-10-17T03:00:00Z"), cp: 50, oo: 1 },
      // ya estaba antes del último historial: no se repite
      c: { at: minute("2026-10-16T20:00:00Z"), cp: 7, oo: 1 },
    });
    expect(h.snaps.a.map((p) => p[1])).toEqual([10, 9]);
    expect(h.snaps.b).toEqual([[minute("2026-10-17T03:00:00Z"), 50, 1]]);
    expect(h.snaps.c).toBeUndefined();
  });

  it("guarda el precio mínimo solo cuando cambia o pasaron muchas horas", () => {
    let h = emptyHistory("es");
    const snap = (cp: number, oo: number, iso: string) =>
      (h = mergeHistory(h, [s("a", { currentPrice: cp, currentOpenOffers: oo })], at(iso)));
    snap(10, 3, "2026-10-17T00:00:00Z");
    snap(10, 3, "2026-10-17T06:00:00Z"); // igual y reciente: no se guarda
    snap(9, 3, "2026-10-17T07:00:00Z"); // cambió: se guarda
    snap(9, 3, "2026-10-18T05:00:00Z"); // igual pero 22 h después: se guarda
    expect(h.snaps.a.map((p) => p[1])).toEqual([10, 9, 9]);
  });

  it("no guarda nada de furnis que nunca tuvieron ofertas ni ventas", () => {
    const h = mergeHistory(emptyHistory("es"), [s("nada", {})], at("2026-10-17T00:00:00Z"));
    expect(h.snaps.nada).toBeUndefined();
    expect(h.days.nada).toBeUndefined();
  });

  it("recorta la cantidad de puntos guardados", () => {
    let h = emptyHistory("es");
    for (let i = 0; i < SNAP_RETENTION + 10; i++) {
      h = mergeHistory(h, [s("a", { currentPrice: 100 + (i % 2), currentOpenOffers: 1 })], new Date(Date.UTC(2026, 0, 1) + i * 3600_000));
    }
    expect(h.snaps.a).toHaveLength(SNAP_RETENTION);
  });
});

describe("series para los gráficos", () => {
  it("une historial guardado y datos en vivo", () => {
    const live = s("a", { statsDate: "2026-10-17", history: [day(-1, 20, 5)] });
    const rows = mergeDayRows(
      [
        [20261001, 15, 1, 3],
        [20261016, 18, 2, 3],
      ],
      live,
    );
    expect(rows.map((r) => r.avg)).toEqual([15, 20]);
    expect(lastDays(rows, 7, Date.UTC(2026, 9, 16))).toHaveLength(1);
    expect(lastDays(rows, Number.POSITIVE_INFINITY, 0)).toHaveLength(2);
  });

  it("agrega el punto en vivo del precio mínimo al final", () => {
    const rows = snapRows([[1000, 10, 2]], { at: 1000 * 60_000 + 1, cp: 8, oo: 3 });
    expect(rows.map((r) => r.cp)).toEqual([10, 8]);
  });
});
