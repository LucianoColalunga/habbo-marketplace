"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { splitLocale } from "@/lib/i18n/config";

const LINKS = [
  { href: "/nft", key: "home", exact: true },
  { href: "/nft/coleccion/furni", key: "furni" },
  { href: "/nft/coleccion/ropa", key: "ropa" },
  { href: "/nft/coleccion/mascotas", key: "mascotas" },
  { href: "/nft/coleccion/tokens", key: "tokens" },
  { href: "/nft/coleccion/addons", key: "addons" },
  { href: "/nft/rankings", key: "rankings" },
  { href: "/nft/billetera", key: "wallet" },
  { href: "/nft/acerca", key: "about" },
] as const;

export function NftNav() {
  const { t, href } = useI18n();
  const { rest } = splitLocale(usePathname() ?? "/");
  return (
    <nav aria-label={t.nftNav.aria} className="mx-auto max-w-6xl overflow-x-auto relative px-4">
      <ul className="flex gap-1 pb-2 text-sm">
        {LINKS.map((link) => {
          const active = "exact" in link ? rest === link.href : rest.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                prefetch={false}
                href={href(link.href)}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap rounded-lg px-3 py-1.5 transition-colors ${
                  active ? "bg-[#f5b942]/15 text-text" : "text-text-2 hover:bg-surface hover:text-text"
                }`}
              >
                {t.nftNav[link.key]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
