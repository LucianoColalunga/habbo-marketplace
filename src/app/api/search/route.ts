import { searchCategories, searchFurni } from "@/lib/data/views";
import { isEnabledHotel } from "@/lib/hotels";
import { isLang, localePath } from "@/lib/i18n/config";
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
  const rawLang = url.searchParams.get("lang");
  const lang = isLang(rawLang) ? rawLang : "es";
  const [found, cats] = await Promise.all([searchFurni(hotel, q, 24), searchCategories(hotel, q, lang)]);
  // Categorías que coinciden con lo escrito ("pisos", "sofás"...), para ver todos los de ese tipo.
  const categories = cats.map((c) => ({
    path: localePath(lang, `/${hotel}/categorias/${c.cat}${c.sub ? `/${c.sub}` : ""}`),
    label: c.label,
    count: c.count,
  }));
  const results = found.slice(0, limit).map((r) => ({
    k: r.k,
    n: r.n,
    r: r.r,
    t: r.t,
    cp: r.cp,
    oo: r.oo,
  }));
  return Response.json(
    { results, categories },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
