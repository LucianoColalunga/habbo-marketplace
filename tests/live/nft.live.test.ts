import { describe, expect, it } from "vitest";
import { fetchRates, getStacks, ImmutableClient, listSalesSince, normalizeStack } from "@/lib/nft/api";
import { NFT_COLLECTIONS } from "@/lib/nft/collections";

/** Contrato con la API real de Immutable zkEVM (unos 6 pedidos). */
const client = new ImmutableClient({ intervalMs: 400 });

describe("API pública de Immutable (real)", () => {
  it("las 5 colecciones oficiales existen", async () => {
    for (const c of NFT_COLLECTIONS) {
      type Col = { name?: string; contract_type?: string };
      const raw = await client.get<{ result?: Col } & Col>(
        `https://api.immutable.com/v1/chains/imtbl-zkevm-mainnet/collections/${c.address}`,
      );
      const body = raw.result ?? raw;
      expect(body.contract_type).toBe("ERC721");
      expect(body.name?.toLowerCase().replace(/[^a-z]/g, "")).toBe(c.official.toLowerCase().replace(/[^a-z]/g, ""));
    }
  });

  it("devuelve modelos con precio en USD y ventas recientes", async () => {
    const [stack] = await getStacks(client, ["019c05de-fd53-99ad-99be-cb21be61ab86"]);
    expect(stack?.n).toBe("Silver 4th Anniversary Plaque");
    expect(stack?.supply).toBeGreaterThan(0);
    const { sales } = await listSalesSince(client, NFT_COLLECTIONS[0].address, new Date(Date.now() - 86_400_000).toISOString(), 1);
    expect(sales.length).toBeGreaterThan(0);
    expect(sales[0].symbol).toMatch(/ETH|IMX|USDC|USDT/);
    expect(normalizeStack({})).toBeNull();
  });

  it("publica cotizaciones a dólares", async () => {
    const rates = await fetchRates(client);
    expect(rates.ethereum).toBeGreaterThan(100);
  });
});
