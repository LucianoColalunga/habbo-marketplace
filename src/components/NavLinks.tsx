"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { splitLocale } from "@/lib/i18n/config";

const LINKS = [
  { href: "", key: "home" },
  { href: "/rankings", key: "rankings" },
  { href: "/ofertas", key: "deals" },
  { href: "/alertas", key: "alerts" },
  { href: "/acerca", key: "about" },
] as const;

export function NavLinks({ hotel }: { hotel: string }) {
  const { t, href } = useI18n();
  const { rest } = splitLocale(usePathname() ?? "/");
  return (
    <nav aria-label={t.nav.aria} className="mx-auto max-w-6xl overflow-x-auto px-4">
      <ul className="flex gap-1 pb-2 text-sm">
        {LINKS.map((link) => {
          const path = `/${hotel}${link.href}`;
          const active = link.href === "" ? rest === path : rest.startsWith(path);
          return (
            <li key={link.key}>
              <Link
                prefetch={false}
                href={href(path)}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap rounded-lg px-3 py-1.5 transition-colors ${
                  active ? "bg-surface-2 text-text" : "text-text-2 hover:bg-surface hover:text-text"
                }`}
              >
                {t.nav[link.key]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
