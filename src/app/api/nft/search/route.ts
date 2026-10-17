import { searchNft } from "@/lib/nft/views";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";

/** Búsqueda en los NFT guardados por el recolector (no consulta a Immutable). */
export async function GET(request: Request) {
  const limited = rateLimit(`nft-search:${clientIp(request)}`, 60, 60_000);
  if (!limited.ok) {
    return Response.json(
      { error: "Demasiadas búsquedas seguidas. Probá de nuevo en unos segundos." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter), "Cache-Control": "no-store" } },
    );
  }
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 60);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 8, 1), 24);
  const results = (await searchNft(q, 24)).slice(0, limit).map((r) => ({
    id: r.id,
    n: r.n,
    img: r.img,
    rarity: r.rarity,
    floorUsd: r.floorUsd,
  }));
  return Response.json(
    { results },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
