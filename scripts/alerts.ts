/**
 * Chequeo de alertas del servidor sin escanear (consulta en vivo solo los
 * furnis de ALERTS_RULES y avisa por Discord / Telegram).
 *   npm run alerts
 */
import { runServerAlerts } from "../src/lib/alerts/server";

async function main() {
  const result = await runServerAlerts();
  console.log(
    `Reglas: ${result.rules} · coincidencias: ${result.matched} · avisos enviados: ${result.sent} · canales: ${
      result.channels.join(", ") || "ninguno configurado"
    }`,
  );
  for (const e of result.errors) console.error(`Error: ${e}`);
  process.exit(result.errors.length ? 1 : 0);
}

void main();
