/**
 * Límite simple de pedidos por IP, en memoria de cada instancia del servidor.
 * No reemplaza un firewall, pero frena a quien intente agotar el cupo gratuito
 * de funciones con búsquedas al azar (las repetidas ya las sirve la caché del CDN).
 */
interface Bucket {
  count: number;
  reset: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): { ok: boolean; retryAfter: number } {
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) if (b.reset <= now) buckets.delete(k);
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  bucket.count++;
  return bucket.count <= limit ? { ok: true, retryAfter: 0 } : { ok: false, retryAfter: Math.ceil((bucket.reset - now) / 1000) };
}

/** IP del visitante según los encabezados que agrega Vercel. */
export function clientIp(request: Request): string {
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "desconocida";
}

/** Solo para tests. */
export function resetRateLimits() {
  buckets.clear();
}
