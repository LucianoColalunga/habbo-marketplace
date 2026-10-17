import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { NftNav } from "@/components/nft/NftNav";
import { SearchBox } from "@/components/SearchBox";
import { SectionSwitch } from "@/components/SectionSwitch";
import { defaultHotel } from "@/lib/hotels";

export const metadata: Metadata = {
  title: { default: "NFT de Habbo — precios y ventas", template: "%s · NFT · Furnímetro" },
  description:
    "Precios piso, ventas y tendencias de los coleccionables NFT oficiales de Habbo en la blockchain Immutable. Sección separada del Marketplace de créditos.",
};

export default function NftLayout({ children }: LayoutProps<"/nft">) {
  return (
    <div className="theme-nft flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-[#a78bfa]/30 bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link href="/nft" className="shrink-0" aria-label="Furnímetro NFT, inicio">
            <Logo />
          </Link>
          <SectionSwitch active="nft" />
          <div className="order-3 w-full md:order-2 md:w-auto md:flex-1">
            <SearchBox nft />
          </div>
        </div>
        <NftNav />
      </header>
      <div className="border-b border-[#a78bfa]/20 bg-[#a78bfa]/10">
        <p className="mx-auto max-w-6xl px-4 py-2 text-sm text-text-2">
          <strong className="text-text">Sección NFT</strong>: coleccionables oficiales de Habbo en la blockchain Immutable,
          que se compran con criptomonedas (precios en dólares). No son los furnis del Marketplace del juego: para eso andá
          a{" "}
          <Link href={`/${defaultHotel()}`} className="text-accent underline-offset-2 hover:underline">
            Marketplace (créditos)
          </Link>
          .
        </p>
      </div>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6">{children}</main>
      <footer className="mt-16 border-t border-line">
        <div className="mx-auto max-w-6xl space-y-2 px-4 py-8 text-sm text-text-2">
          <p>
            Datos de la API pública de Immutable zkEVM; imágenes servidas por Habbo (nft-tokens.habbo.com). Furnímetro no es
            oficial ni está afiliado a Sulake Oy, Azerion ni Immutable.
          </p>
          <p className="text-muted">
            Esto no es asesoramiento financiero. Los precios de los NFT cambian rápido y pueden bajar a cero; los dólares son
            aproximados según la cotización del momento.
          </p>
        </div>
      </footer>
    </div>
  );
}
