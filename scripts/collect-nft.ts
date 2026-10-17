/**
 * Recolector de la sección NFT (colecciones oficiales de Habbo en Immutable zkEVM).
 *   npm run collect:nft              -> una corrida (la primera carga 7 días de ventas)
 *   npm run collect:nft -- --dias 14 -> la primera vez, cargar 14 días hacia atrás
 * Guarda en .data/nft/ o, si está BLOB_READ_WRITE_TOKEN, en Vercel Blob.
 */
import { runNftScan } from "../src/lib/nft/scan";

async function main() {
  const args = process.argv.slice(2);
  const i = args.indexOf("--dias");
  const backfillDays = i >= 0 ? Math.min(Math.max(Number(args[i + 1]) || 7, 1), 30) : 7;
  try {
    await runNftScan({
      backfillDays,
      maxSalePages: 200,
      log: (m) => console.log(`[${new Date().toLocaleTimeString("es-AR")}] [nft] ${m}`),
    });
    process.exit(0);
  } catch (error) {
    console.error(`[nft] Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

void main();
