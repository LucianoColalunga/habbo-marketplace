import type { NextConfig } from "next";
import { parseHotelList } from "./src/lib/hotels";
import { langRedirects, langRewrites } from "./src/lib/i18n/routing";
import { securityHeaders } from "./src/lib/security-headers";

const dev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // No generar archivos de instrucciones para herramientas externas en el repo.
  agentRules: false,
  // No anunciar el framework en cada respuesta.
  poweredByHeader: false,
  experimental: {
    // 404 propia para direcciones que no son de ningún idioma.
    globalNotFound: true,
  },
  cacheLife: {
    // Datos que salen del último escaneo guardado (rankings, resúmenes). Cambian
    // cuando corre el recolector, que además invalida la caché al terminar; por eso
    // se regeneran como mucho cada 6 horas (menos trabajo para el servidor).
    // Lo que es "en vivo" se consulta desde el navegador, no pasa por esta caché.
    market: { stale: 300, revalidate: 6 * 3600, expire: 2 * 86400 },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders(dev) }];
  },
  async redirects() {
    return langRedirects(parseHotelList(process.env.NEXT_PUBLIC_HOTELS));
  },
  async rewrites() {
    // Antes que las rutas dinámicas: "/com" es el hotel .com en español, no el idioma "com".
    return { beforeFiles: langRewrites(), afterFiles: [], fallback: [] };
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
