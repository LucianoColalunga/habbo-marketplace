import Link from "next/link";
import { enabledHotels, HOTELS, type HotelCode } from "@/lib/hotels";
import { Logo } from "./Logo";
import { HotelSwitcher } from "./HotelSwitcher";
import { NavLinks } from "./NavLinks";
import { SearchBox } from "./SearchBox";

export function SiteHeader({ hotel }: { hotel: HotelCode }) {
  const hotels = enabledHotels().map((code) => ({ code, label: HOTELS[code].label, region: HOTELS[code].region }));
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href={`/${hotel}`} className="shrink-0" aria-label="Furnímetro, inicio">
          <Logo />
        </Link>
        <div className="order-3 w-full md:order-2 md:w-auto md:flex-1">
          <SearchBox key={hotel} hotel={hotel} />
        </div>
        <div className="order-2 ml-auto md:order-3">
          <HotelSwitcher hotel={hotel} hotels={hotels} />
        </div>
      </div>
      <NavLinks hotel={hotel} />
    </header>
  );
}
