"use client";

import { usePathname, useRouter } from "next/navigation";

interface Option {
  code: string;
  label: string;
  region: string;
}

export function HotelSwitcher({ hotel, hotels }: { hotel: string; hotels: Option[] }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <label className="flex items-center gap-2 text-sm text-text-2">
      <span className="hidden sm:inline">Hotel</span>
      <select
        value={hotel}
        onChange={(e) => {
          const next = e.target.value;
          const rest = pathname.split("/").slice(2).join("/");
          router.push(`/${next}${rest ? `/${rest}` : ""}`);
        }}
        className="rounded-lg border border-line bg-surface px-2 py-1.5 text-text"
        aria-label="Elegir hotel"
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
