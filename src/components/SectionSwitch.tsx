import Link from "next/link";
import { defaultHotel } from "@/lib/hotels";

/**
 * Selector siempre visible entre las dos secciones del sitio, que son
 * independientes: el Marketplace del juego (créditos) y los NFT (blockchain).
 */
export function SectionSwitch({ active, hotel }: { active: "market" | "nft"; hotel?: string }) {
  const marketHref = `/${hotel ?? defaultHotel()}`;
  const base = "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors";
  return (
    <nav aria-label="Sección del sitio" className="inline-flex rounded-xl border border-line bg-surface p-1">
      <Link
        href={marketHref}
        aria-current={active === "market" ? "page" : undefined}
        className={`${base} ${active === "market" ? "bg-[#f5b942] text-[#1a1405]" : "text-text-2 hover:text-text"}`}
      >
        Marketplace <span className="hidden font-normal sm:inline">· créditos</span>
      </Link>
      <Link
        href="/nft"
        aria-current={active === "nft" ? "page" : undefined}
        className={`${base} ${active === "nft" ? "bg-[#a78bfa] text-[#140d2b]" : "text-text-2 hover:text-text"}`}
      >
        NFT <span className="hidden font-normal sm:inline">· blockchain</span>
      </Link>
    </nav>
  );
}
