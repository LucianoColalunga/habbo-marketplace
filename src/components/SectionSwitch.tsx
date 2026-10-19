import Link from "next/link";
import { homeHotel } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";

/**
 * Selector siempre visible entre las dos secciones del sitio, que son
 * independientes: el Marketplace del juego (créditos) y los NFT (blockchain).
 */
export async function SectionSwitch({ active, hotel }: { active: "market" | "nft"; hotel?: string }) {
  const { lang, t, href } = await getI18n();
  const marketHref = href(`/${hotel ?? homeHotel(lang)}`);
  const base = "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors";
  return (
    <nav aria-label={t.section.aria} className="inline-flex rounded-xl border border-line bg-surface p-1">
      <Link
        prefetch={false}
        href={marketHref}
        aria-current={active === "market" ? "page" : undefined}
        className={`${base} ${active === "market" ? "bg-[#a78bfa] text-[#140d2b]" : "text-text-2 hover:text-text"}`}
      >
        {t.section.market} <span className="hidden font-normal sm:inline">· {t.section.marketSub}</span>
      </Link>
      <Link
        prefetch={false}
        href={href("/nft")}
        aria-current={active === "nft" ? "page" : undefined}
        className={`${base} ${active === "nft" ? "bg-[#f5b942] text-[#1a1405]" : "text-text-2 hover:text-text"}`}
      >
        {t.section.nft} <span className="hidden font-normal sm:inline">· {t.section.nftSub}</span>
      </Link>
    </nav>
  );
}
