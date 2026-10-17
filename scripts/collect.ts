/**
 * Recolector de datos para correr en una PC (a mano o con el Programador de tareas).
 *   npm run collect                   -> una corrida rotativa en cada hotel habilitado (~4 min c/u)
 *   npm run collect -- es --full      -> recorre todo el catálogo de .es (~45 min, 12 pedidos/min)
 *   npm run collect -- es com --force -> ignora el intervalo mínimo entre corridas
 * Guarda en .data/ o, si está BLOB_READ_WRITE_TOKEN, en Vercel Blob.
 */
import { enabledHotels, isHotelCode, type HotelCode } from "../src/lib/hotels";
import { runScan } from "../src/lib/market/scan";
import { rulesFromEnv, runServerAlerts } from "../src/lib/alerts/server";

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const full = args.includes("--full");
  const noAlerts = args.includes("--no-alerts");
  const requested = args.filter((a) => !a.startsWith("--"));
  const invalid = requested.filter((a) => !isHotelCode(a));
  if (invalid.length) {
    console.error(`Hotel desconocido: ${invalid.join(", ")}`);
    process.exit(2);
  }
  const hotels = (requested.length ? requested : enabledHotels()) as HotelCode[];
  const rules = rulesFromEnv();
  let failed = 0;
  for (const hotel of hotels) {
    try {
      const outcome = await runScan(hotel, {
        force,
        full,
        priorityItems: rules.filter((r) => r.hotel === hotel).map((r) => r.item),
        log: (m) => console.log(`[${new Date().toLocaleTimeString("es-AR")}] [${hotel}] ${m}`),
      });
      if (outcome.status === "skipped") {
        console.log(`[${hotel}] Omitido: ${outcome.reason} Usá --force para correr igual.`);
        continue;
      }
      if (!noAlerts) {
        const alerts = await runServerAlerts({ hotel, summary: outcome.summary });
        if (alerts.channels.length) {
          console.log(`[${hotel}] Alertas: ${alerts.sent} enviadas, ${alerts.matched} coincidencias.`);
        }
        for (const e of alerts.errors) console.error(`[${hotel}] Alertas: ${e}`);
      }
    } catch (error) {
      failed++;
      console.error(`[${hotel}] Error: ${(error as Error).message}`);
    }
  }
  process.exit(failed ? 1 : 0);
}

void main();
