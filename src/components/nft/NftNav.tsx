"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/nft", label: "Inicio NFT", exact: true },
  { href: "/nft/coleccion/furni", label: "Furnis" },
  { href: "/nft/coleccion/ropa", label: "Ropa" },
  { href: "/nft/coleccion/mascotas", label: "Mascotas" },
  { href: "/nft/coleccion/tokens", label: "Tokens" },
  { href: "/nft/coleccion/addons", label: "Add-ons" },
  { href: "/nft/rankings", label: "Rankings" },
  { href: "/nft/acerca", label: "Datos y límites" },
];

export function NftNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Secciones NFT" className="mx-auto max-w-6xl overflow-x-auto px-4">
      <ul className="flex gap-1 pb-2 text-sm">
        {LINKS.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap rounded-lg px-3 py-1.5 transition-colors ${
                  active ? "bg-[#a78bfa]/20 text-text" : "text-text-2 hover:bg-surface hover:text-text"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
