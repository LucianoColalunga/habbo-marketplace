"use client";

import { useState } from "react";
import { furniIconUrl } from "@/lib/habbo/images";

/** Ícono del furni desde el CDN de Habbo; si no carga, muestra una caja neutra. */
export function FurniIcon({ k, r, size = 40, alt = "" }: { k: string; r: number; size?: number; alt?: string }) {
  const [failed, setFailed] = useState(false);
  const src = furniIconUrl(k, r);
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-2"
      style={{ width: size, height: size }}
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="pixel max-h-full max-w-full object-contain"
          style={{ transform: size >= 64 ? "scale(2)" : undefined }}
        />
      ) : (
        <svg viewBox="0 0 24 24" className="h-1/2 w-1/2 text-muted" aria-hidden="true">
          <path d="M12 3 21 8v8l-9 5-9-5V8Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3 8l9 5 9-5M12 13v8" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )}
    </span>
  );
}
