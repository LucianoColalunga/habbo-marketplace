import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HeaderSkeleton } from "@/components/Skeletons";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { enabledHotels, isEnabledHotel } from "@/lib/hotels";

export function generateStaticParams() {
  return enabledHotels().map((hotel) => ({ hotel }));
}

type Params = LayoutProps<"/[hotel]">["params"];

async function Header({ params }: { params: Params }) {
  const { hotel } = await params;
  if (!isEnabledHotel(hotel)) notFound();
  return <SiteHeader hotel={hotel} />;
}

async function Footer({ params }: { params: Params }) {
  const { hotel } = await params;
  return <SiteFooter hotel={isEnabledHotel(hotel) ? hotel : enabledHotels()[0]} />;
}

export default function HotelLayout({ children, params }: LayoutProps<"/[hotel]">) {
  return (
    <>
      <Suspense fallback={<HeaderSkeleton />}>
        <Header params={params} />
      </Suspense>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6">{children}</main>
      <Suspense fallback={null}>
        <Footer params={params} />
      </Suspense>
    </>
  );
}
