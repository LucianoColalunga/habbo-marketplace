import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { decode, encode, type Storage, type StoredObject } from "./index";

export class FsStorage implements Storage {
  readonly kind = "fs" as const;
  private readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  private file(key: string) {
    const resolved = path.resolve(this.root, key);
    if (!resolved.startsWith(this.root + path.sep)) throw new Error(`Clave inválida: ${key}`);
    return resolved;
  }

  async read<T>(key: string): Promise<StoredObject<T> | null> {
    try {
      const bytes = await readFile(this.file(key));
      return { data: decode<T>(bytes), etag: createHash("sha1").update(bytes).digest("hex") };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async write<T>(key: string, data: T): Promise<void> {
    const target = this.file(key);
    await mkdir(path.dirname(target), { recursive: true });
    const tmp = `${target}.${process.pid}.tmp`;
    await writeFile(tmp, encode(data));
    await rename(tmp, target);
  }
}
