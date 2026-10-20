import type { Metadata } from "next";
import Link from "next/link";
import { AccountButton } from "@/components/account/AccountButton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { NftNav } from "@/components/nft/NftNav";
import { SearchBox } from "@/components/SearchBox";
import { SectionSwitch } from "@/components/SectionSwitch";
import { CookieSettingsButton } from "@/components/CookieBanner";
import { ConstructionBadge, FooterCredit } from "@/components/SiteFooter";
import { StarsToggle } from "@/components/StarsToggle";
import { homeHotel } from "@/lib/i18n/config";
import { ogImage } from "@/lib/i18n/seo";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { lang, p } = await getI18n();
  return {
    title: { default: p.meta.nftTitle, template: p.meta.nftTemplate },
    description: p.meta.nftDescription,
    openGraph: { images: [ogImage(lang, "nft", p)] },
  };
}

export default async function NftLayout({ children }: LayoutProps<"/[lang]/nft">) {
  const { lang, p, href } = await getI18n();
  return (
    <div className="theme-nft flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-[#f5b942]/30 bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link prefetch={false} href={href("/nft")} className="shrink-0" aria-label={p.header.nftHomeAria}>
            <Logo />
          </Link>
          <SectionSwitch active="nft" />
          <div className="order-3 w-full md:order-2 md:w-auto md:flex-1">
            <SearchBox nft />
          </div>
          <div className="order-2 ml-auto flex items-center gap-2 md:order-3">
            <LanguageSwitcher />
            <AccountButton />
          </div>
        </div>
        <NftNav />
      </header>
      <div className="border-b border-[#f5b942]/20 bg-[#221e15]">
        <p className="mx-auto max-w-6xl px-4 py-2 text-sm text-text-2">
          {p.nft.banner(
            <Link prefetch={false} href={href(`/${homeHotel(lang)}`)} className="text-accent underline-offset-2 hover:underline">
              {p.nft.marketLink}
            </Link>,
          )}
        </p>
      </div>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6">{children}</main>
      <footer className="mt-16 border-t border-line bg-bg/80">
        <div className="mx-auto max-w-6xl space-y-2 px-4 py-8 text-sm text-text-2">
          <p>
            <ConstructionBadge label={p.footer.building} />
            {p.nft.footerData}
          </p>
          <p className="text-muted">{p.nft.footerRisk}</p>
          <p className="flex flex-wrap gap-x-4">
            <Link prefetch={false} className="hover:text-text" href={href(`/${homeHotel(lang)}/privacidad`)}>
              {p.footer.linkPrivacy}
            </Link>
            <CookieSettingsButton />
            <StarsToggle />
          </p>
        </div>
        <FooterCredit label={p.footer.builtBy} />
      </footer>
    </div>
  );
}
