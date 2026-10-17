import { timingSafeEqual } from "node:crypto";

/**
 * Las rutas del recolector solo se ejecutan con el secreto CRON_SECRET.
 * Vercel lo manda solo en sus cron jobs como "Authorization: Bearer <secreto>".
 * Sin secreto configurado, solo se permiten en desarrollo local.
 */
export function isAuthorizedCron(request: Request, env: NodeJS.ProcessEnv = process.env): boolean {
  const secret = env.CRON_SECRET;
  if (!secret) return env.NODE_ENV !== "production";
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
