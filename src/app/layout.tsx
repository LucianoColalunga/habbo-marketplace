import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { AlertWatcher } from "@/components/alerts/AlertWatcher";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const grotesk = Space_Grotesk({ variable: "--font-grotesk", subsets: ["latin"], weight: ["500", "700"] });

export const metadata: Metadata = {
  title: { default: "Furnímetro — precios del Marketplace", template: "%s · Furnímetro" },
  description:
    "Precios, ofertas abiertas, promedios e historial del Marketplace de furnis, con datos de la API pública de Habbo. Sitio de fans no oficial.",
  applicationName: "Furnímetro",
};

export const viewport: Viewport = {
  themeColor: "#0c0e13",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${inter.variable} ${grotesk.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <AlertWatcher />
      </body>
    </html>
  );
}
