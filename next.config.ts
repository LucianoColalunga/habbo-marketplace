import type { NextConfig } from "next";
import { parseHotelList } from "./src/lib/hotels";
import { securityHeaders } from "./src/lib/security-headers";

const dev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // No generar archivos de instrucciones para herramientas externas en el repo.
  agentRules: false,
  // No anunciar el framework en cada respuesta.
  poweredByHeader: false,
  cacheLife: {
    // Datos que salen del último escaneo guardado (rankings, resúmenes).
    // Lo que es "en vivo" se consulta desde el navegador, no pasa por esta caché.
    market: { stale: 300, revalidate: 600, expire: 86400 },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders(dev) }];
  },
  async redirects() {
    return [{ source: "/", destination: `/${parseHotelList(process.env.NEXT_PUBLIC_HOTELS)[0]}`, permanent: false }];
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
