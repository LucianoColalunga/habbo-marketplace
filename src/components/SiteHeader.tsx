import Link from "next/link";
import { enabledHotels, HOTELS, type HotelCode } from "@/lib/hotels";
import { getI18n } from "@/lib/i18n/server";
import { HotelSwitcher } from "./HotelSwitcher";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";
import { NavLinks } from "./NavLinks";
import { SearchBox } from "./SearchBox";
import { SectionSwitch } from "./SectionSwitch";

export async function SiteHeader({ hotel }: { hotel: HotelCode }) {
  const { t, p, href } = await getI18n();
  const hotels = enabledHotels().map((code) => ({ code, label: HOTELS[code].label, region: t.hotel.regions[code] }));
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link prefetch={false} href={href(`/${hotel}`)} className="shrink-0" aria-label={p.header.homeAria}>
          <Logo />
        </Link>
        <SectionSwitch active="market" hotel={hotel} />
        <div className="order-3 w-full md:order-2 md:w-auto md:flex-1">
          <SearchBox key={hotel} hotel={hotel} />
        </div>
        <div className="order-2 ml-auto flex items-center gap-2 md:order-3">
          <HotelSwitcher hotel={hotel} hotels={hotels} />
          <LanguageSwitcher />
        </div>
      </div>
      <NavLinks hotel={hotel} />
    </header>
  );
}
