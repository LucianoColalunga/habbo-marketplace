"use client";

import { formatDateTime, relativeTime } from "@/lib/format";
import { useNow } from "@/lib/use-now";

/** "hace 5 min", calculado en el navegador para que no quede congelado en la caché. */
export function TimeAgo({ iso }: { iso: string | null }) {
  const now = useNow();
  if (!iso) return <span>nunca</span>;
  return (
    <time dateTime={iso} title={formatDateTime(iso)} suppressHydrationWarning>
      {now === null ? formatDateTime(iso) : relativeTime(iso, Math.max(now, Date.parse(iso)))}
    </time>
  );
}
