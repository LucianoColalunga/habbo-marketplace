import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { notFound } from "next/navigation";
import { lang as rootLang } from "next/root-params";
import { AlertWatcher } from "@/components/alerts/AlertWatcher";
import { Starfield } from "@/components/Starfield";
import { LangProvider } from "@/lib/i18n/client";
import { isLang, LANG_INFO, LANGS, localePath, type Lang } from "@/lib/i18n/config";
import { ogImage } from "@/lib/i18n/seo";
import { getI18n, i18nFor } from "@/lib/i18n/server";
import { SITE_NAME, siteUrl } from "@/lib/site";
import "../globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const grotesk = Space_Grotesk({ variable: "--font-grotesk", subsets: ["latin"], weight: ["500", "700"] });

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { lang, p } = await getI18n();
  const google = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: p.meta.title, template: p.meta.template },
    description: p.meta.description,
    applicationName: SITE_NAME,
    openGraph: { type: "website", siteName: SITE_NAME, images: [ogImage(lang, "market", p)] },
    twitter: { card: "summary_large_image" },
    // Código de Google Search Console (opcional, es público).
    ...(google && /^[\w-]{10,100}$/.test(google) ? { verification: { google } } : {}),
  };
}

/** Datos estructurados del sitio (los lee Google; no se ejecutan). */
function siteJsonLd(lang: Lang, description: string): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: `${siteUrl()}${localePath(lang, "/")}`,
    inLanguage: LANG_INFO[lang].html,
    description,
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: siteJsonLd(lang, i18nFor(lang).p.meta.description) }} />
        <Starfield />
        <LangProvider lang={lang}>
          {children}
          <AlertWatcher />
        </LangProvider>
      </body>
    </html>
  );
}
