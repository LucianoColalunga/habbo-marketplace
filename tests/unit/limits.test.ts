import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_HOTELS, MAIN_HOTELS } from "@/lib/hotels";
import { HISTORY_EVERY_MINUTES } from "@/lib/market/scan";

/**
 * Las tareas automáticas de vercel.json tienen que entrar en el plan gratis:
 * como mucho una vez por día cada una (regla de Vercel Hobby) y sin pasar las
 * 2.000 escrituras por mes de Vercel Blob (si se pasa, el almacenamiento queda
 * bloqueado 30 días). Esta prueba hace la cuenta para que nadie la rompa sin querer.
 */
const config = JSON.parse(readFileSync("vercel.json", "utf8")) as { crons: { path: string; schedule: string }[] };
const scans = config.crons.filter((c) => c.path.startsWith("/api/cron/scan"));
const param = (path: string, name: string) => new URL(path, "https://x").searchParams.get(name);
const hotels = [...new Set(scans.map((c) => param(c.path, "hotel")!))];
const hourOf = (schedule: string) => Number(schedule.split(" ")[1]);
const scansOf = (hotel: string) => scans.filter((c) => param(c.path, "hotel") === hotel);
const isMain = (hotel: string) => (MAIN_HOTELS as string[]).includes(hotel);

/**
 * Cuántas veces por día se guarda el historial de un hotel con sus horarios. En
 * Vercel Hobby cada cron arranca en cualquier minuto de su hora, así que se cuenta
 * como si dos corridas pudieran quedar hasta una hora más separadas.
 */
function historyWritesPerDay(hours: number[]): number {
  const every = HISTORY_EVERY_MINUTES / 60 - 1;
  const times = [0, 1, 2].flatMap((day) => hours.map((h) => day * 24 + h)).sort((a, b) => a - b);
  let last = Number.NEGATIVE_INFINITY;
  let writes = 0;
  for (const t of times) {
    if (t - last < every) continue;
    last = t;
    if (t >= 48) writes++; // se cuenta el tercer día, cuando ya se repite igual
  }
  return writes;
}

describe("tareas automáticas dentro del plan gratis", () => {
  it("cada una corre una vez por día y hay menos de 100", () => {
    expect(config.crons.length).toBeLessThanOrEqual(100);
    for (const c of config.crons) expect(c.schedule, c.path).toMatch(/^\d{1,2} \d{1,2} \* \* \*$/);
  });

  it("escanea los nueve hoteles, los principales más seguido", () => {
    expect([...hotels].sort()).toEqual([...DEFAULT_HOTELS].sort());
    const least = Math.min(...MAIN_HOTELS.map((h) => scansOf(h).length));
    for (const h of hotels.filter((h) => !isMain(h))) {
      expect(scansOf(h).length, h).toBeGreaterThanOrEqual(1);
      expect(scansOf(h).length, h).toBeLessThan(least);
    }
  });

  it("nunca hay dos escaneos en la misma hora (la API de Habbo limita los pedidos por IP)", () => {
    const hours = scans.map((c) => hourOf(c.schedule));
    expect(new Set(hours).size).toBe(hours.length);
  });

  it("las ofertas se publican en los canales una sola vez por día, solo en los hoteles principales", () => {
    for (const hotel of hotels) {
      const notify = scansOf(hotel).filter((c) => param(c.path, "avisos") === "1");
      expect(notify.length, hotel).toBe(isMain(hotel) ? 1 : 0);
    }
  });

  it("el historial se guarda como mucho 2 veces por día en los principales y 1 en los demás", () => {
    for (const hotel of hotels) {
      const writes = historyWritesPerDay(scansOf(hotel).map((c) => hourOf(c.schedule)));
      expect(writes, hotel).toBeLessThanOrEqual(isMain(hotel) ? 2 : 1);
    }
  });

  it("las escrituras del mes quedan muy por debajo de las 2.000", () => {
    const perDay =
      scans.length + // un resumen por escaneo
      hotels.reduce((n, h) => n + historyWritesPerDay(scansOf(h).map((c) => hourOf(c.schedule))), 0) + // historial
      scans.filter((c) => param(c.path, "avisos") === "1").length + // estado de las ofertas publicadas
      1 + // alertas propias
      2; // NFT: resumen e historial
    const perMonth = perDay * 31 + hotels.length * 10; // + catálogos que cambian (≈ 10 por hotel) y margen
    expect(perMonth).toBeLessThanOrEqual(1500);
  });
});
