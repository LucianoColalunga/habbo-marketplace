import { searchFurni } from "@/lib/data/views";
import { isEnabledHotel } from "@/lib/hotels";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";

/** Búsqueda en el catálogo guardado (no consulta a Habbo). */
export async function GET(request: Request) {
  const limited = rateLimit(`search:${clientIp(request)}`, 60, 60_000);
  if (!limited.ok) {
    return Response.json(
      { error: "Demasiadas búsquedas seguidas. Probá de nuevo en unos segundos." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter), "Cache-Control": "no-store" } },
    );
  }
  const url = new URL(request.url);
  const hotel = url.searchParams.get("hotel");
  const q = (url.searchParams.get("q") ?? "").slice(0, 60);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 8, 1), 24);
  if (!isEnabledHotel(hotel)) return Response.json({ error: "hotel inválido" }, { status: 400 });
  const results = (await searchFurni(hotel, q, 24)).slice(0, limit).map((r) => ({
    k: r.k,
    n: r.n,
    r: r.r,
    t: r.t,
    cp: r.cp,
    oo: r.oo,
  }));
  return Response.json(
    { results },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=600, stale-while-revalidate=3600" } },
  );
}
