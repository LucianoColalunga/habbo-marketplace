/**
 * Sube a Vercel Blob los datos que ya juntó el recolector en esta PC (.data/).
 * Sirve para que el sitio publicado arranque con datos sin esperar días.
 *   vercel env pull .env.vercel    (trae BLOB_READ_WRITE_TOKEN a un archivo aparte)
 *   npm run push-data              (todos los hoteles)
 *   npm run push-data -- es        (solo .es)
 *   npm run push-data -- nft       (solo la sección NFT)
 * Cada archivo subido cuenta como 1 de las 2.000 escrituras mensuales gratis.
 */
import { enabledHotels, isHotelCode, type HotelCode } from "../src/lib/hotels";
import { keys } from "../src/lib/storage";
import { BlobStorage } from "../src/lib/storage/blob";
import { FsStorage } from "../src/lib/storage/fs";
import { nftKeys } from "../src/lib/nft/scan";

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("Falta BLOB_READ_WRITE_TOKEN (corré `vercel env pull .env.vercel` y volvé a intentar).");
    process.exit(2);
  }
  const args = process.argv.slice(2);
  const onlyNft = args.length === 1 && args[0] === "nft";
  const requested = args.filter(isHotelCode) as HotelCode[];
  const hotels = onlyNft ? [] : requested.length ? requested : enabledHotels();
  const local = new FsStorage(process.env.DATA_DIR || ".data");
  const remote = new BlobStorage(process.env.BLOB_ACCESS === "public" ? "public" : "private");
  for (const hotel of hotels) {
    for (const key of [keys.catalog(hotel), keys.history(hotel), keys.summary(hotel)]) {
      const object = await local.read(key);
      if (!object) {
        console.log(`[${hotel}] ${key}: no existe en local, se saltea`);
        continue;
      }
      await remote.write(key, object.data);
      console.log(`[${hotel}] ${key}: subido`);
    }
  }
  if (onlyNft || requested.length === 0) {
    for (const key of [nftKeys.history(), nftKeys.summary()]) {
      const object = await local.read(key);
      if (!object) continue;
      await remote.write(key, object.data);
      console.log(`[nft] ${key}: subido`);
    }
  }
}

void main().catch((error) => {
  console.error((error as Error).message);
  process.exit(1);
});
