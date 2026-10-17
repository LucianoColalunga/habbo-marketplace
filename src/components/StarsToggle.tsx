"use client";

import { useSyncExternalStore } from "react";
import { useI18n } from "@/lib/i18n/client";
import { setStarsEnabled, starsEnabled, subscribeStars } from "@/lib/stars-pref";

/** Botón del pie de página para apagar o prender el fondo de estrellas. */
export function StarsToggle() {
  const { t } = useI18n();
  const on = useSyncExternalStore(subscribeStars, starsEnabled, () => true);
  return (
    <button type="button" onClick={() => setStarsEnabled(!on)} aria-pressed={!on} className="hover:text-text">
      ✦ {on ? t.stars.off : t.stars.on}
    </button>
  );
}
