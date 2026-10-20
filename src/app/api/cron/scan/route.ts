import { revalidateTag } from "next/cache";
import { rulesFromEnv, runServerAlerts } from "@/lib/alerts/server";
import { forgetHotel, loadSummary } from "@/lib/data/store";
import { enabledHotels, isEnabledHotel, type HotelCode } from "@/lib/hotels";
import { runScan } from "@/lib/market/scan";
import { isAuthorizedCron } from "@/lib/server/cron-auth";

// Una corrida usa ~4 minutos para respetar el ritmo de la API (Vercel Hobby permite hasta 300 s).
export const maxDuration = 300;

/** Si no se indica hotel, corre el que tenga el escaneo más viejo. */
async function stalestHotel(): Promise<HotelCode> {
  let best: { hotel: HotelCode; at: number } | null = null;
  for (const hotel of enabledHotels()) {
    const summary = await loadSummary(hotel);
    const at = summary ? Date.parse(summary.generatedAt) : 0;
    if (!best || at < best.at) best = { hotel, at };
  }
  return best!.hotel;
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return Response.json({ error: "no autorizado" }, { status: 401 });
  const url = new URL(request.url);
  const param = url.searchParams.get("hotel");
  if (param && !isEnabledHotel(param)) return Response.json({ error: "hotel inválido" }, { status: 400 });
  const hotel = param && isEnabledHotel(param) ? param : await stalestHotel();
  const started = Date.now();
  try {
    const outcome = await runScan(hotel, {
      priorityItems: rulesFromEnv()
        .filter((r) => r.hotel === hotel)
        .map((r) => r.item),
      log: (m) => console.log(`[scan ${hotel}] ${m}`),
    });
    if (outcome.status === "skipped") return Response.json(outcome);
    forgetHotel(hotel);
    revalidateTag(`market:${hotel}`, "max");
    // Las ofertas se publican en los canales solo en la corrida marcada con ?avisos=1
    // (una por día por hotel), aunque haya escaneos cada pocas horas.
    const alerts = url.searchParams.get("avisos") === "1" ? await runServerAlerts({ hotel, summary: outcome.summary }) : null;
    return Response.json({
      status: "done",
      hotel,
      seconds: Math.round((Date.now() - started) / 1000),
      scan: outcome.summary.scan,
      coverage: outcome.summary.coverage,
      alerts,
    });
  } catch (error) {
    console.error(`[scan ${hotel}]`, error);
    return Response.json({ status: "error", hotel, error: (error as Error).message }, { status: 500 });
  }
}
