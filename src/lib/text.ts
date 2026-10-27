/**
 * Minúsculas, sin tildes y con espacios simples: para comparar textos al buscar o
 * filtrar. La "ı" turca y la "ß" alemana pasan a "i" y "ss", como se escriben con
 * un teclado sin esas letras.
 */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, " ")
    .trim();
}
