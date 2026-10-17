import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";
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
            <StarsToggle />
          </li>
        </ul>
      </div>
    </footer>
  );
}
