/** Minúsculas, sin tildes y con espacios simples: para comparar textos al buscar o filtrar. */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
