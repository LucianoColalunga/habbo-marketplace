"use client";

import { useState } from "react";
import { loadRules, useLocal, type LocalRule } from "@/lib/alerts/local";
import { describeRule } from "@/lib/alerts/rules";
import { HOTELS } from "@/lib/hotels";

const NO_RULES: LocalRule[] = [];

/** Exporta la lista de este navegador para usarla en las alertas del servidor. */
export function ServerExport() {
  const rules = useLocal(loadRules, NO_RULES);
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(rules.map(({ id, hotel, item, mode, value }) => ({ id, hotel, item, mode, value })));

  return (
    <div className="space-y-4">
      {rules.length === 0 ? (
        <p className="card p-4 text-sm text-text-2">Primero armá tu lista en la página de Alertas; después volvé acá.</p>
      ) : (
        <ul className="card divide-y divide-line/70 px-4 text-sm">
          {rules.map((r) => (
            <li key={r.id} className="py-2 text-text-2">
              <span className="text-text">{r.name}</span> ({HOTELS[r.hotel].label}): {describeRule(r)}
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={rules.length === 0}
          onClick={async () => {
            await navigator.clipboard.writeText(json);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
          }}
          className="rounded-lg bg-accent px-4 py-2 font-medium text-accent-ink disabled:opacity-50"
        >
          Copiar mi lista
        </button>
        <span className="text-sm text-text-2" aria-live="polite">
          {copied ? "Copiada." : ""}
        </span>
      </div>
      <textarea
        readOnly
        value={json}
        rows={3}
        aria-label="Lista en formato JSON"
        className="w-full rounded-lg border border-line bg-bg p-2 font-mono text-xs text-text-2"
        onFocus={(e) => e.currentTarget.select()}
      />
    </div>
  );
}
