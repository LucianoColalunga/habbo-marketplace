import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { homeHotel } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { lang, p, href } = await getI18n();
  return (
    <main className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <LogoMark className="h-14 w-14" />
      <h1 className="font-display text-3xl font-bold text-text">{p.notFound.title}</h1>
      <p className="text-text-2">{p.notFound.body}</p>
      <Link prefetch={false} href={href(`/${homeHotel(lang)}`)} className="rounded-xl bg-accent px-4 py-2 font-medium text-accent-ink">
        {p.notFound.back}
      </Link>
    </main>
  );
}
