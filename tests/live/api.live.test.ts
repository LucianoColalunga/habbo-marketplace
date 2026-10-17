import { describe, expect, it } from "vitest";
import { fetchBatch, HabboApiError } from "@/lib/habbo/api";
import { fetchFurnidataHash } from "@/lib/habbo/furnidata";

/**
 * Contrato con la API real (4 pedidos en total, espaciados). Si Habbo cambia
 * el formato, estas pruebas lo detectan.
 */
const pause = () => new Promise((r) => setTimeout(r, 5000));

describe("API pública de Habbo (real)", () => {
  it("devuelve estadísticas del Marketplace con el formato esperado", async () => {
    const out = await fetchBatch("es", { room: ["throne", "club_sofa"], wall: ["poster"] }, { retries: 1 });
    const throne = out.find((o) => o.item === "throne");
    expect(throne).toBeDefined();
    expect(throne!.type).toBe("r");
    expect(throne!.statsDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(throne!.historyLimitInDays).toBe(30);
    for (const h of throne!.history) {
      expect(h.offset).toBeLessThan(0);
      expect(h.offset).toBeGreaterThanOrEqual(-30);
      expect(h.sold).toBeGreaterThan(0);
    }
    const sofa = out.find((o) => o.item === "club_sofa")!;
    expect(sofa.currentOpenOffers).toBeGreaterThan(0);
    expect(sofa.currentPrice).toBeGreaterThan(0);
    await pause();
  });

  it("omite furnis que no existen", async () => {
    const out = await fetchBatch("com", { room: ["club_sofa", "no_existe_zzz_123"], wall: [] }, { retries: 1 });
    expect(out.map((o) => o.item)).toEqual(["club_sofa"]);
    await pause();
  });

  it("rechaza más de 25 furnis por tipo (validado del lado nuestro antes de pedir)", async () => {
    await expect(fetchBatch("es", { room: Array.from({ length: 26 }, (_, i) => `x${i}`), wall: [] })).rejects.toBeInstanceOf(
      HabboApiError,
    );
  });

  it("publica el hash del furnidata", async () => {
    const hash = await fetchFurnidataHash("br");
    expect(hash).toMatch(/^[0-9a-f]{20,}$/);
  });
});
