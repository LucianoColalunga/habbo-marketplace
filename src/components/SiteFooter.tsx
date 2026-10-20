import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";
import { CookieSettingsButton } from "./CookieBanner";
import { SocialLink } from "./SocialLink";
import { StarsToggle } from "./StarsToggle";

export async function SiteFooter({ hotel }: { hotel: string }) {
  const { p, href } = await getI18n();
  return (
    <footer className="mt-16 border-t border-line bg-bg/80">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm text-text-2 md:grid-cols-[2fr_1fr]">
        <div className="space-y-2">
          <p>{p.footer.about}</p>
          <p className="text-muted">{p.footer.data}</p>
        </div>
        <ul className="space-y-1 md:text-right">
          <li>
            <Link prefetch={false} className="hover:text-text" href={href(`/${hotel}/acerca`)}>
              {p.footer.linkAbout}
            </Link>
          </li>
          <li>
            <Link prefetch={false} className="hover:text-text" href={href(`/${hotel}/alertas`)}>
              {p.footer.linkAlerts}
            </Link>
          </li>
          <li>
            <a className="hover:text-text" href="https://github.com/LucianoColalunga/habbo-marketplace" rel="noopener">
              {p.footer.linkSource}
            </a>
          </li>
          <li>
            <SocialLink label={p.footer.linkX} />
          </li>
          <li>
            <Link prefetch={false} className="hover:text-text" href={href(`/${hotel}/privacidad`)}>
              {p.footer.linkPrivacy}
            </Link>
          </li>
          <li className="flex flex-wrap gap-x-4 md:justify-end">
            <CookieSettingsButton />
            <StarsToggle />
          </li>
        </ul>
      </div>
      <FooterCredit label={p.footer.builtBy} />
    </footer>
  );
}

/** Última línea del pie: quién hizo el sitio. */
export function FooterCredit({ label }: { label: string }) {
  return (
    <div className="border-t border-line">
      <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted">
        {label} <span className="font-display font-bold uppercase tracking-widest text-accent">Luky Dev</span>
      </p>
    </div>
  );
}
