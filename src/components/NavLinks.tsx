"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "", label: "Inicio" },
  { href: "/rankings", label: "Rankings" },
  { href: "/ofertas", label: "Ofertas" },
  { href: "/alertas", label: "Alertas" },
  { href: "/acerca", label: "Datos y límites" },
];

export function NavLinks({ hotel }: { hotel: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Secciones" className="mx-auto max-w-6xl overflow-x-auto px-4">
      <ul className="flex gap-1 pb-2 text-sm">
        {LINKS.map((link) => {
          const href = `/${hotel}${link.href}`;
          const active = link.href === "" ? pathname === href : pathname.startsWith(href);
          return (
            <li key={link.label}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap rounded-lg px-3 py-1.5 transition-colors ${
                  active ? "bg-surface-2 text-text" : "text-text-2 hover:bg-surface hover:text-text"
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
