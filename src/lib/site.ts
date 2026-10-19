/**
 * Dirección pública del sitio, para enlaces absolutos (dirección canónica,
 * sitemap, vista previa al compartir). En Vercel sale sola del dominio de
 * producción; se puede fijar con SITE_URL.
 */
export function siteUrl(env: Record<string, string | undefined> = process.env): string {
  const raw = env.SITE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
  try {
    const url = new URL(raw);
    if (url.protocol === "https:" || url.hostname === "localhost") return url.origin;
  } catch {
    // sin dirección configurada
  }
  return "http://localhost:3000";
}

export const SITE_NAME = "Bomhams Market";
