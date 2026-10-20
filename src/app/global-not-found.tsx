import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const grotesk = Space_Grotesk({ variable: "--font-grotesk", subsets: ["latin"], weight: ["500", "700"] });

export const metadata: Metadata = { title: "404 · Stats" };

/** Página para direcciones que no existen en ningún idioma (se muestra en los tres). */
export default function GlobalNotFound() {
  return (
    <html lang="es" className={`${inter.variable} ${grotesk.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <main className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
          <LogoMark className="h-14 w-14" />
          <h1 className="font-display text-3xl font-bold text-text">No encontramos esa página</h1>
          <p className="text-text-2" lang="pt-BR">
            Não encontramos essa página
          </p>
          <p className="text-text-2" lang="en">
            We couldn&apos;t find that page
          </p>
          <nav className="mt-2 flex flex-wrap justify-center gap-2">
            <Link prefetch={false} href="/es" className="rounded-xl bg-accent px-4 py-2 font-medium text-accent-ink">
              Inicio
            </Link>
            <Link prefetch={false} href="/pt/br" lang="pt-BR" className="rounded-xl border border-line px-4 py-2 text-text">
              Início
            </Link>
            <Link prefetch={false} href="/en/com" lang="en" className="rounded-xl border border-line px-4 py-2 text-text">
              Home
            </Link>
          </nav>
        </main>
      </body>
    </html>
  );
}
