"use client";

import { useState } from "react";

/** Imagen oficial del NFT (servida por Habbo en nft-tokens.habbo.com). */
export function NftImage({ src, size = 40, alt = "" }: { src: string; size?: number; alt?: string }) {
  const [failed, setFailed] = useState(false);
  const ok = src.startsWith("https://nft-tokens.habbo.com/") && !failed;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-2 ring-1 ring-[#a78bfa]/25"
      style={{ width: size, height: size }}
    >
      {ok ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="pixel max-h-full max-w-full object-contain"
        />
      ) : (
        <svg viewBox="0 0 24 24" className="h-1/2 w-1/2 text-muted" aria-hidden="true">
          <path d="M12 2 21 7v10l-9 5-9-5V7Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}
