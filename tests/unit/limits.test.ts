import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Las tareas automáticas de vercel.json tienen que entrar en el plan gratis:
 * como mucho una vez por día cada una (regla de Vercel Hobby) y sin pasar las
 * 2.000 escrituras por mes de Vercel Blob (si se pasa, el almacenamiento queda
 * bloqueado 30 días). Esta prueba hace la cuenta para que nadie la rompa sin querer.
 */
const config = JSON.parse(readFileSync("vercel.json", "utf8")) as { crons: { path: string; schedule: string }[] };
const scans = config.crons.filter((c) => c.path.startsWith("/api/cron/scan"));
const hotels = [...new Set(scans.map((c) => new URL(c.path, "https://x").searchParams.get("hotel")))];

describe("tareas automáticas dentro del plan gratis", () => {
  it("cada una corre una vez por día y hay menos de 100", () => {
    expect(config.crons.length).toBeLessThanOrEqual(100);
    for (const c of config.crons) expect(c.schedule, c.path).toMatch(/^\d{1,2} \d{1,2} \* \* \*$/);
  });

  it("las ofertas se publican en los canales una sola vez por día por hotel", () => {
    for (const hotel of hotels) {
      const notify = scans.filter((c) => c.path.includes(`hotel=${hotel}`) && c.path.includes("avisos=1"));
      expect(notify.length, `${hotel}`).toBe(1);
    }
  });

  it("las escrituras del mes quedan muy por debajo de las 2.000", () => {
    const perDay =
      scans.length + // un resumen por escaneo
      hotels.length * 3 + // historial: como mucho cada 8 horas
      hotels.length + // estado de las ofertas publicadas (una corrida con avisos por hotel)
      1 + // alertas propias
      2; // NFT: resumen e historial
    const perMonth = perDay * 31 + 30; // + catálogos que cambian y margen
    expect(perMonth).toBeLessThanOrEqual(1500);
  });
});
