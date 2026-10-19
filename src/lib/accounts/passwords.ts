import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * Contraseñas cifradas con scrypt (lento a propósito: probar contraseñas a
 * ciegas cuesta mucho) y una sal distinta por cuenta. Nunca se guarda ni se
 * registra la contraseña en sí.
 */
const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } satisfies ScryptOptions;
const KEY_LEN = 32;

function scrypt(password: string, salt: Buffer, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCallback(password.normalize("NFKC"), salt, KEY_LEN, opts, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, PARAMS);
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, keyB64] = parts;
  const expected = Buffer.from(keyB64, "base64url");
  const key = await scrypt(password, Buffer.from(saltB64, "base64url"), { N: Number(n), r: Number(r), p: Number(p), maxmem: PARAMS.maxmem });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Para que "usuario inexistente" tarde lo mismo que "contraseña mal" (no se puede adivinar quién existe). */
let dummy: Promise<string> | null = null;
export function dummyHash(): Promise<string> {
  dummy ??= hashPassword("contraseña-que-no-es-de-nadie");
  return dummy;
}

const COMMON = new Set([
  "1234567890", "0123456789", "12345678910", "1111111111", "qwertyuiop", "asdfghjkl1", "password12", "password123",
  "contrasena", "contraseña", "contrasena1", "contraseña1", "habbohotel", "habbo12345", "iloveyou12", "abcdefghij",
]);

export type PasswordProblem = "short" | "long" | "common" | "has_username";

/** Reglas simples y claras: al menos 10 caracteres, que no sea obvia ni contenga el usuario. */
export function passwordProblem(password: string, username: string): PasswordProblem | null {
  if (password.length < 10) return "short";
  if (password.length > 128) return "long";
  const lower = password.toLowerCase();
  if (COMMON.has(lower) || /^(.)\1+$/.test(password)) return "common";
  if (username && lower.includes(username.toLowerCase())) return "has_username";
  return null;
}
