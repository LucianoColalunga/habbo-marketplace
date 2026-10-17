import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <LogoMark className="h-14 w-14" />
      <h1 className="font-display text-3xl font-bold text-text">No encontramos esa página</h1>
      <p className="text-text-2">Puede que el furni no sea intercambiable o que el enlace esté mal escrito.</p>
      <Link href="/" className="rounded-xl bg-accent px-4 py-2 font-medium text-accent-ink">
        Volver al inicio
      </Link>
    </main>
  );
}
