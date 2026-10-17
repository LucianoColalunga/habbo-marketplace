import { get, put } from "@vercel/blob";
import { decode, encode, type Storage, type StoredObject } from "./index";

async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export class BlobStorage implements Storage {
  readonly kind = "blob" as const;
  /** Última versión leída de cada clave, para pedir solo si cambió (respuesta 304). */
  private readonly memo = new Map<string, StoredObject<unknown>>();

  constructor(private readonly access: "public" | "private") {}

  async read<T>(key: string): Promise<StoredObject<T> | null> {
    const previous = this.memo.get(key) as StoredObject<T> | undefined;
    const result = await get(key, { access: this.access, ifNoneMatch: previous?.etag ?? undefined });
    if (!result) {
      this.memo.delete(key);
      return null;
    }
    if (result.statusCode === 304 && previous) return previous;
    if (result.statusCode !== 200) return previous ?? null;
    const object: StoredObject<T> = { data: decode<T>(await streamToBuffer(result.stream)), etag: result.blob.etag };
    this.memo.set(key, object as StoredObject<unknown>);
    return object;
  }

  async write<T>(key: string, data: T): Promise<void> {
    await put(key, encode(data), {
      access: this.access,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/gzip",
      // Las lecturas que salen de la caché del CDN no cuentan para el límite gratis de
      // Blob. Al reescribir un archivo, Vercel actualiza esa caché en menos de 60 s, así
      // que puede durar mucho sin mostrar datos viejos.
      cacheControlMaxAge: 7 * 86400,
    });
    this.memo.delete(key);
  }
}
