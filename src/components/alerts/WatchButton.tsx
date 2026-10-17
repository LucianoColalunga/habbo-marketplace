"use client";

import Link from "next/link";
import { useState } from "react";
import { addRule, loadRules, useLocal, type LocalRule } from "@/lib/alerts/local";
import { newRuleId, type RuleMode } from "@/lib/alerts/rules";
import type { HotelCode } from "@/lib/hotels";
import { useI18n } from "@/lib/i18n/client";
import { describeRuleIn } from "@/lib/i18n/ui";

const NO_RULES: LocalRule[] = [];

export function WatchButton({ hotel, item }: { hotel: HotelCode; item: { k: string; n: string; t: "r" | "w"; r: number } }) {
  const { t: ui, href } = useI18n();
  const t = ui.watch;
  const rules = useLocal(loadRules, NO_RULES);
  const mine = rules.filter((r) => r.hotel === hotel && r.item === item.k);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<RuleMode>("below_avg");
  const [value, setValue] = useState("20");
  const [error, setError] = useState("");

  const save = () => {
    const n = Number(value.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0 || (mode === "below_avg" && n >= 100)) {
      setError(mode === "below_avg" ? ui.alerts.errPct : ui.alerts.errPrice);
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
        {mine.length ? t.watching(mine.length) : t.watch}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded-xl border border-line bg-surface-2 p-4 shadow-2xl shadow-black/50">
          <p className="mb-3 text-sm text-text-2">{t.intro}</p>
          <fieldset className="space-y-2 text-sm">
            <legend className="sr-only">{t.legend}</legend>
            <label className="flex items-center gap-2">
              <input type="radio" name="mode" checked={mode === "below_avg"} onChange={() => (setMode("below_avg"), setValue("20"))} />
              {t.belowAvg}
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="mode" checked={mode === "below_price"} onChange={() => (setMode("below_price"), setValue(""))} />
              {t.atPrice}
            </label>
          </fieldset>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-24 rounded-lg border border-line bg-surface px-2 py-1.5 text-text"
              aria-label={mode === "below_avg" ? t.pctAria : t.priceAria}
            />
            <span className="text-text-2">{mode === "below_avg" ? t.pctSuffix : t.priceSuffix}</span>
          </label>
          {error && <p className="mt-2 text-sm text-down">{error}</p>}
          <div className="mt-4 flex items-center justify-between">
            <Link prefetch={false} href={href(`/${hotel}/alertas`)} className="text-sm text-accent hover:underline">
              {t.myAlerts}
            </Link>
            <button type="button" onClick={save} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink">
              {t.save}
            </button>
          </div>
          {mine.length > 0 && (
            <ul className="mt-3 space-y-1 border-t border-line pt-3 text-xs text-text-2">
              {mine.map((r) => (
                <li key={r.id}>• {describeRuleIn(ui, r)}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
