"use client";

import { useEffect, useState } from "react";
import { Notice, StatTile } from "@/components/ui";
import { useI18n } from "@/lib/i18n/client";
import { useNow } from "@/lib/use-now";

/**
 * Usuarios conectados en Habbo Origins, desde su API pública oficial
 * (https://origins.habbo.<tld>/api/public/origins/users). La consulta la hace
 * el navegador de cada visitante (la API lo permite) y se repite cada minuto
 * mientras la pestaña está a la vista.
 */
export const ORIGINS = [
  { id: "com", label: ".com", host: "https://origins.habbo.com" },
  { id: "es", label: ".es", host: "https://origins.habbo.es" },
  { id: "br", label: ".com.br", host: "https://origins.habbo.com.br" },
] as const;

type Counts = Partial<Record<(typeof ORIGINS)[number]["id"], number>>;

async function fetchCounts(): Promise<Counts> {
  const out: Counts = {};
  await Promise.all(
    ORIGINS.map(async (o) => {
      try {
        const res = await fetch(`${o.host}/api/public/origins/users`, { mode: "cors", credentials: "omit", cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as { onlineUsers?: unknown };
        const n = Number(body.onlineUsers);
        if (Number.isFinite(n) && n >= 0) out[o.id] = Math.round(n);
      } catch {
        // ese hotel no respondió: se muestra sin dato
      }
    }),
  );
  return out;
}

export function OnlineUsers() {
  const { t: ui, f } = useI18n();
  const t = ui.online;
  const now = useNow();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [at, setAt] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      void fetchCounts().then((c) => {
        if (!alive) return;
        setCounts(c);
        setAt(Date.now());
      });
    load();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (counts === null) return <div className="skeleton h-32" aria-busy="true" />;
  const values = ORIGINS.map((o) => counts[o.id]).filter((v): v is number => v !== undefined);
  if (values.length === 0) return <Notice tone="warn">{t.error}</Notice>;
  const total = values.reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-3" aria-live="polite">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label={t.total} value={<span className="tnum">{f.int(total)}</span>} />
        {ORIGINS.map((o) => (
          <StatTile key={o.id} label={t.hotel(o.label)} value={<span className="tnum">{counts[o.id] === undefined ? "—" : f.int(counts[o.id])}</span>} />
        ))}
      </div>
      {at !== null && <p className="text-xs text-muted">{t.updated(now ? f.relative(new Date(at).toISOString(), now) : f.dateTime(new Date(at).toISOString()))}</p>}
    </div>
  );
}
