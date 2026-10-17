/** Normaliza texto para buscar: minúsculas y sin acentos. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[_*]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface Searchable {
  k: string;
  n: string;
}

/** Puntaje de coincidencia (0 = no coincide). Más alto = mejor. */
export function matchScore(item: Searchable, query: string): number {
  const q = normalize(query);
  if (!q) return 0;
  const name = normalize(item.n);
  const key = normalize(item.k);
  const raw = query.trim().toLowerCase();
  if (item.k.toLowerCase() === raw) return 100;
  if (name === q) return 95;
  if (name.startsWith(q)) return 80;
  const words = name.split(" ");
  if (words.some((w) => w.startsWith(q))) return 65;
  if (key.startsWith(q)) return 55;
  if (name.includes(q)) return 45;
  if (key.includes(q)) return 30;
  // Todas las palabras de la búsqueda presentes, en cualquier orden.
  const parts = q.split(" ").filter(Boolean);
  if (parts.length > 1 && parts.every((p) => name.includes(p) || key.includes(p))) return 25;
  return 0;
}

export function rankMatches<T extends Searchable>(items: T[], query: string, activity: (item: T) => number, limit: number): T[] {
  const scored: { item: T; score: number; act: number }[] = [];
  for (const item of items) {
    const score = matchScore(item, query);
    if (score > 0) scored.push({ item, score, act: activity(item) });
  }
  scored.sort((a, b) => b.score - a.score || b.act - a.act || a.item.n.localeCompare(b.item.n));
  return scored.slice(0, limit).map((s) => s.item);
}
