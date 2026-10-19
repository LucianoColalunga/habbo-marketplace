"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { splitLocale } from "@/lib/i18n/config";
import { StarfieldEngine } from "@/lib/starfield";
import { starsEnabled, subscribeStars } from "@/lib/stars-pref";

const ACCENT = { market: "#a78bfa", nft: "#f5b942" };
const INTERACTIVE = "a,button,input,select,textarea,label,summary,option,[role=button],[role=option],[role=combobox],[contenteditable],img,svg,video";

function alphaOf(color: string): number {
  if (!color || color === "transparent") return 0;
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (!m) return 1;
  const parts = m[1].split(/[\s,/]+/).filter(Boolean);
  return parts.length >= 4 ? Number.parseFloat(parts[3]) : 1;
}

/** El toque cayó sobre el fondo (donde se ven las estrellas) y no sobre un botón o una tarjeta. */
function onBackground(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest(INTERACTIVE)) return false;
  for (let el: Element | null = target; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
    if (el.classList.contains("card")) return false;
    if (alphaOf(getComputedStyle(el).backgroundColor) > 0.6) return false;
  }
  return true;
}

/**
 * Fondo de estrellas que titilan; con el mouse se dibujan líneas hacia las
 * cercanas y al tocar una, explota. Es solo decoración: no recibe clics (los
 * escucha la ventana), se pausa con la pestaña oculta, respeta "reducir
 * movimiento" y se puede apagar desde el pie de página.
 */
export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<StarfieldEngine | null>(null);
  const enabled = useSyncExternalStore(subscribeStars, starsEnabled, () => true);
  const section = splitLocale(usePathname() ?? "/").rest.startsWith("/nft") ? "nft" : "market";

  useEffect(() => {
    if (engineRef.current) engineRef.current.palette[2] = ACCENT[section];
  }, [section]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!enabled || !canvas || !ctx) return;
    const engine = new StarfieldEngine();
    engine.palette[2] = ACCENT[section];
    engineRef.current = engine;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let pointer: { x: number; y: number } | null = null;
    let raf = 0;
    let last = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      engine.resize(w, h);
      if (reduce.matches) engine.draw(ctx, null);
    };

    const frame = (time: number) => {
      raf = requestAnimationFrame(frame);
      const elapsed = last ? time - last : 16.7;
      if (elapsed < 15) return; // como mucho 60 cuadros por segundo
      last = time;
      engine.step(Math.min(elapsed / 16.7, 3));
      engine.draw(ctx, pointer);
    };

    const start = () => {
      if (raf || reduce.matches || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const onVisibility = () => (document.hidden ? stop() : start());
    const onMotion = () => {
      if (reduce.matches) {
        stop();
        engine.draw(ctx, null);
      } else start();
    };
    const onMove = (e: PointerEvent) => {
      pointer = e.pointerType === "mouse" && finePointer.matches ? { x: e.clientX, y: e.clientY } : null;
    };
    const onLeave = () => {
      pointer = null;
    };
    const onClick = (e: MouseEvent) => {
      if (reduce.matches || e.defaultPrevented || window.getSelection()?.toString()) return;
      if (onBackground(e.target)) engine.explodeAt(e.clientX, e.clientY);
    };

    resize();
    start();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    reduce.addEventListener("change", onMotion);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("click", onClick);
    return () => {
      stop();
      engineRef.current = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      reduce.removeEventListener("change", onMotion);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("click", onClick);
    };
    // El color de la sección se actualiza aparte, sin reiniciar las estrellas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  if (!enabled) return null;
  return <canvas ref={canvasRef} data-starfield="" aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />;
}
