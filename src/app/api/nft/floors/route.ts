import { getNftFloors } from "@/lib/nft/views";

/**
 * Precio piso de cada modelo NFT (del último escaneo), para el inspector de
 * billeteras. Es igual para todos: la guarda el CDN.
 */
export async function GET() {
  const data = await getNftFloors();
  return Response.json(data, {
    headers: { "Cache-Control": "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
