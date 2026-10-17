"use client";

import { useI18n } from "@/lib/i18n/client";
import { useNow } from "@/lib/use-now";

/** "hace 5 min", calculado en el navegador para que no quede congelado en la caché. */
export function TimeAgo({ iso }: { iso: string | null }) {
  const now = useNow();
  const { f } = useI18n();
  if (!iso) return <span>{f.relative(null, 0)}</span>;
  return (
    <time dateTime={iso} title={f.dateTime(iso)} suppressHydrationWarning>
      {now === null ? f.dateTime(iso) : f.relative(iso, Math.max(now, Date.parse(iso)))}
    </time>
  );
}
