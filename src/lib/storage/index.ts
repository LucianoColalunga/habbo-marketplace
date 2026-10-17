import { gunzipSync, gzipSync } from "node:zlib";

/**
 * Almacenamiento de los datos que junta el recolector.
 * - En local: archivos dentro de DATA_DIR (por defecto ./.data).
 * - En Vercel: Vercel Blob, si existe BLOB_READ_WRITE_TOKEN.
 * Todo se guarda como JSON comprimido con gzip para ocupar poco.
 *
 * Ojo con el plan gratuito de Vercel Blob: 2.000 operaciones de escritura y
 * 10.000 lecturas sin caché por mes. Por eso se escriben pocos archivos grandes
 * (uno por hotel y por tipo de dato) en lugar de muchos chicos.
 */

export interface StoredObject<T> {
  data: T;
  etag: string | null;
}

export interface Storage {
  readonly kind: "fs" | "blob";
  read<T>(key: string): Promise<StoredObject<T> | null>;
  write<T>(key: string, data: T): Promise<void>;
}

export function encode(data: unknown): Buffer {
  return gzipSync(Buffer.from(JSON.stringify(data), "utf8"), { level: 9 });
}

export function decode<T>(bytes: Uint8Array): T {
  return JSON.parse(gunzipSync(bytes).toString("utf8")) as T;
}

let cached: Storage | null = null;

export async function getStorage(): Promise<Storage> {
  if (cached) return cached;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { BlobStorage } = await import("./blob");
    cached = new BlobStorage(process.env.BLOB_ACCESS === "public" ? "public" : "private");
  } else {
    const { FsStorage } = await import("./fs");
    cached = new FsStorage(process.env.DATA_DIR || ".data");
  }
  return cached;
}

/** Solo para tests. */
export function setStorageForTests(storage: Storage | null) {
  cached = storage;
}

export const keys = {
  catalog: (hotel: string) => `catalog/${hotel}.json.gz`,
  summary: (hotel: string) => `summary/${hotel}.json.gz`,
  history: (hotel: string) => `history/${hotel}.json.gz`,
  alertState: () => `alerts/state.json.gz`,
};
