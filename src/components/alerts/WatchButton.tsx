"use client";

import Link from "next/link";
import { useState } from "react";
import { addRule, loadRules, useLocal, type LocalRule } from "@/lib/alerts/local";
import { describeRule, newRuleId, type RuleMode } from "@/lib/alerts/rules";
import type { HotelCode } from "@/lib/hotels";

const NO_RULES: LocalRule[] = [];

export function WatchButton({ hotel, item }: { hotel: HotelCode; item: { k: string; n: string; t: "r" | "w"; r: number } }) {
  const rules = useLocal(loadRules, NO_RULES);
  const mine = rules.filter((r) => r.hotel === hotel && r.item === item.k);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<RuleMode>("below_avg");
  const [value, setValue] = useState("20");
  const [error, setError] = useState("");

  const save = () => {
    const n = Number(value.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0 || (mode === "below_avg" && n >= 100)) {
      setError(mode === "below_avg" ? "Poné un porcentaje entre 1 y 99." : "Poné un precio mayor a 0.");
      return;
    }
    addRule({ id: newRuleId(), hotel, item: item.k, mode, value: n, name: item.n, t: item.t, r: item.r, createdAt: Date.now() });
    setOpen(false);
    setError("");
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="rounded-xl bg-accent px-4 py-2 font-medium text-accent-ink hover:brightness-110"
      >
        {mine.length ? `Vigilando (${mine.length})` : "Vigilar precio"}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded-xl border border-line bg-surface-2 p-4 shadow-2xl shadow-black/50">
          <p className="mb-3 text-sm text-text-2">Te avisamos cuando el precio mínimo publicado cumpla esta condición.</p>
          <fieldset className="space-y-2 text-sm">
            <legend className="sr-only">Tipo de alerta</legend>
            <label className="flex items-center gap-2">
              <input type="radio" name="mode" checked={mode === "below_avg"} onChange={() => (setMode("below_avg"), setValue("20"))} />
              Por debajo del promedio reciente
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="mode" checked={mode === "below_price"} onChange={() => (setMode("below_price"), setValue(""))} />
              A un precio que elijo o menos
            </label>
          </fieldset>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-24 rounded-lg border border-line bg-surface px-2 py-1.5 text-text"
              aria-label={mode === "below_avg" ? "Porcentaje por debajo del promedio" : "Precio máximo en créditos"}
            />
            <span className="text-text-2">{mode === "below_avg" ? "% o más abajo" : "créditos o menos"}</span>
          </label>
          {error && <p className="mt-2 text-sm text-down">{error}</p>}
          <div className="mt-4 flex items-center justify-between">
            <Link href={`/${hotel}/alertas`} className="text-sm text-accent hover:underline">
              Mis alertas
            </Link>
            <button type="button" onClick={save} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink">
              Guardar alerta
            </button>
          </div>
          {mine.length > 0 && (
            <ul className="mt-3 space-y-1 border-t border-line pt-3 text-xs text-text-2">
              {mine.map((r) => (
                <li key={r.id}>• {describeRule(r)}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
