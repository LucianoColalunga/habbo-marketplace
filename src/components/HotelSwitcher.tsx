"use client";

import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { splitLocale } from "@/lib/i18n/config";

interface Option {
  code: string;
  label: string;
  region: string;
}

export function HotelSwitcher({ hotel, hotels }: { hotel: string; hotels: Option[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, href } = useI18n();
  return (
    <label className="flex items-center gap-2 text-sm text-text-2">
      <span className="hidden sm:inline">{t.hotel.label}</span>
      <select
        value={hotel}
        onChange={(e) => {
          const next = e.target.value;
          const rest = splitLocale(pathname ?? "/").rest.split("/").slice(2).join("/");
          router.push(href(`/${next}${rest ? `/${rest}` : ""}`));
        }}
        className="rounded-lg border border-line bg-surface px-2 py-1.5 text-text"
        aria-label={t.hotel.aria}
      >
        {hotels.map((h) => (
          <option key={h.code} value={h.code}>
            {h.label} · {h.region}
          </option>
        ))}
      </select>
    </label>
  );
}
