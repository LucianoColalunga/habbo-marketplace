import { runServerAlerts } from "@/lib/alerts/server";
import { isAuthorizedCron } from "@/lib/server/cron-auth";

export const maxDuration = 60;

/**
 * Chequeo liviano de las reglas de ALERTS_RULES: consulta en vivo solo esos
 * furnis (uno o dos pedidos) y avisa por Discord/Telegram. Pensado para un cron
 * más frecuente que el del escaneo completo.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return Response.json({ error: "no autorizado" }, { status: 401 });
  try {
    const result = await runServerAlerts();
    return Response.json({ status: "done", ...result });
  } catch (error) {
    return Response.json({ status: "error", error: (error as Error).message }, { status: 500 });
  }
}
