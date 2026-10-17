import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { notFound } from "next/navigation";
import { lang as rootLang } from "next/root-params";
import { AlertWatcher } from "@/components/alerts/AlertWatcher";
import { Starfield } from "@/components/Starfield";
import { LangProvider } from "@/lib/i18n/client";
import { isLang, LANG_INFO, LANGS } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import "../globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const grotesk = Space_Grotesk({ variable: "--font-grotesk", subsets: ["latin"], weight: ["500", "700"] });

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { p } = await getI18n();
  return {
    title: { default: p.meta.title, template: p.meta.template },
    description: p.meta.description,
    applicationName: "Furnímetro",
  };
}

export const viewport: Viewport = {
  themeColor: "#0c0e13",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const lang = await rootLang();
  if (!isLang(lang)) notFound();
  return (
    <html lang={LANG_INFO[lang].html} className={`${inter.variable} ${grotesk.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Starfield />
        <LangProvider lang={lang}>
          {children}
          <AlertWatcher />
        </LangProvider>
      </body>
    </html>
  );
}
