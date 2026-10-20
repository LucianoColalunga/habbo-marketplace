"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { furniIconUrl } from "@/lib/habbo/images";

/**
 * Ícono de Habbo agrandado sin suavizar. Habbo solo publica íconos de unos 30
 * píxeles: se multiplican por un número entero (×2, ×3…) para que el pixel art
 * quede nítido, lo más grande que entre en el cuadro sin pasar de `max`.
 * El cuadro lo define quien lo usa (por ejemplo, `absolute inset-0`).
 */
export function PixelFurni({ k, r, max, alt = "", className = "" }: { k: string; r: number; max: number; alt?: string; className?: string }) {
  const box = useRef<HTMLSpanElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const src = furniIconUrl(k, r);

  const fit = useCallback(() => {
    const i = img.current;
    const b = box.current;
    if (!i || !b || !i.naturalWidth) return;
    const room = Math.min(b.clientWidth, b.clientHeight) * 0.78;
    const scale = Math.max(1, Math.min(max, Math.floor(room / Math.max(i.naturalWidth, i.naturalHeight))));
    const w = i.naturalWidth * scale;
    const h = i.naturalHeight * scale;
    setSize((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
  }, [max]);

  // Se vuelve a medir si cambia el tamaño del cuadro (otra vista, girar el celular...).
  useEffect(() => {
    const b = box.current;
    if (!b) return;
    const observer = new ResizeObserver(() => fit());
    observer.observe(b);
    return () => observer.disconnect();
  }, [fit]);

  return (
    <span ref={box} className={`flex items-center justify-center overflow-hidden ${className}`}>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={img}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={fit}
          onError={() => setFailed(true)}
          className={`pixel max-w-none transition-opacity duration-200 ${size ? "opacity-100" : "opacity-0"}`}
          style={size ? { width: size.w, height: size.h } : undefined}
        />
      ) : (
        <svg viewBox="0 0 24 24" className="h-1/3 w-1/3 text-muted" aria-hidden="true">
          <path d="M12 3 21 8v8l-9 5-9-5V8Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3 8l9 5 9-5M12 13v8" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )}
    </span>
  );
}
