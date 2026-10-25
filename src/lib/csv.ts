/** Tablas a CSV (separado por comas, con BOM para que Excel respete los acentos). */

export type CsvCell = string | number | null | undefined;

function cell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "number" ? (Number.isFinite(value) ? String(value) : "") : value;
  // Evita que Excel interprete el texto como fórmula (=, +, -, @ al principio).
  const safe = /^[=+\-@]/.test(text) && typeof value === "string" ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(rows: CsvCell[][]): string {
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
}

/** Nombre de archivo seguro: letras, números, guiones y la fecha. */
export function csvName(base: string, now = new Date()): string {
  const clean = base.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "stats";
  return `${clean}-${now.toISOString().slice(0, 10)}.csv`;
}

export function downloadCsv(base: string, rows: CsvCell[][]): void {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = csvName(base);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
